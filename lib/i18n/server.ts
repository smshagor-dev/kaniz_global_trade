import prisma from '@/lib/db/prisma'
import { ENGLISH_TRANSLATION_SEED, LANGUAGE_METADATA } from '@/lib/i18n/catalog'
import { translateText } from '@/lib/translation'

type SeedLanguage = (typeof LANGUAGE_METADATA)[number]

export async function ensureLocalizationSeeded() {
  await prisma.$transaction(async (tx) => {
    const seededLanguages: SeedLanguage[] = [...LANGUAGE_METADATA]

    for (const language of LANGUAGE_METADATA) {
      await tx.appLanguage.upsert({
        where: { code: language.code },
        create: {
          code: language.code,
          name: language.name,
          nativeName: language.nativeName,
          isDefault: language.isDefault,
          isActive: true,
          isRtl: language.isRtl,
          autoTranslateReady: language.code === 'en',
          lastTranslatedAt: language.code === 'en' ? new Date() : null,
        },
        update: {
          name: language.name,
          nativeName: language.nativeName,
          isRtl: language.isRtl,
        },
      })
    }

    const english = await tx.appLanguage.findUnique({ where: { code: 'en' } })
    if (!english) return

    for (const [translationKey, value] of Object.entries(ENGLISH_TRANSLATION_SEED)) {
      await tx.appTranslation.upsert({
        where: {
          languageId_translationKey: {
            languageId: english.id,
            translationKey,
          },
        },
        create: {
          languageId: english.id,
          translationKey,
          value,
          isAutoTranslated: false,
        },
        update: {
          value,
          isAutoTranslated: false,
        },
      })
    }

    const allLanguages = await tx.appLanguage.findMany({
      where: { code: { in: seededLanguages.map((language) => language.code) } },
      select: { id: true, code: true },
    })

    for (const language of allLanguages) {
      if (language.code === 'en') continue

      for (const translationKey of Object.keys(ENGLISH_TRANSLATION_SEED)) {
        await tx.appTranslation.upsert({
          where: {
            languageId_translationKey: {
              languageId: language.id,
              translationKey,
            },
          },
          create: {
            languageId: language.id,
            translationKey,
            value: '',
            isAutoTranslated: false,
          },
          update: {},
        })
      }
    }
  })
}

export async function getLanguageCatalog() {
  await ensureLocalizationSeeded()
  const languages = await prisma.appLanguage.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  return languages.map((language) => ({
    id: language.id,
    code: language.code,
    name: language.name,
    nativeName: language.nativeName,
    isDefault: language.isDefault,
    isActive: language.isActive,
    isRtl: language.isRtl,
    autoTranslateReady: language.autoTranslateReady,
    lastTranslatedAt: language.lastTranslatedAt?.toISOString() || null,
  }))
}

export async function getTranslationsForLanguage(languageCode: string) {
  await ensureLocalizationSeeded()

  const [languages, english, selected] = await Promise.all([
    getLanguageCatalog(),
    prisma.appLanguage.findUnique({
      where: { code: 'en' },
      include: { translations: true },
    }),
    prisma.appLanguage.findUnique({
      where: { code: languageCode.toLowerCase() },
      include: { translations: true },
    }),
  ])

  const fallback = Object.fromEntries(
    (english?.translations || []).map((translation) => [translation.translationKey, translation.value])
  )

  const selectedMap = Object.fromEntries(
    (selected?.translations || []).map((translation) => [translation.translationKey, translation.value])
  )

  return {
    languages,
    defaultLanguage: 'en',
    activeLanguage: selected?.code || 'en',
    translations: {
      ...fallback,
      ...selectedMap,
    },
  }
}

export async function createLanguage(input: {
  code: string
  name: string
  nativeName?: string
  isRtl?: boolean
}) {
  await ensureLocalizationSeeded()

  const code = input.code.trim().toLowerCase()
  const name = input.name.trim()
  const nativeName = input.nativeName?.trim() || null

  const english = await prisma.appLanguage.findUnique({
    where: { code: 'en' },
    include: { translations: true },
  })

  if (!english) {
    throw new Error('Base English language is missing')
  }

  const language = await prisma.appLanguage.upsert({
    where: { code },
    create: {
      code,
      name,
      nativeName,
      isRtl: !!input.isRtl,
      isActive: true,
      isDefault: false,
      autoTranslateReady: false,
    },
    update: {
      name,
      nativeName,
      isRtl: !!input.isRtl,
      isActive: true,
    },
  })

  await prisma.$transaction(
    english.translations.map((translation) =>
      prisma.appTranslation.upsert({
        where: {
          languageId_translationKey: {
            languageId: language.id,
            translationKey: translation.translationKey,
          },
        },
        create: {
          languageId: language.id,
          translationKey: translation.translationKey,
          value: '',
          isAutoTranslated: false,
        },
        update: {},
      })
    )
  )

  return language
}

export async function translateLanguagePack(languageId: string) {
  await ensureLocalizationSeeded()

  const language = await prisma.appLanguage.findUnique({
    where: { id: languageId },
  })

  if (!language) throw new Error('Language not found')
  if (language.code === 'en') throw new Error('English is the base language and does not need auto-translation')

  const english = await prisma.appLanguage.findUnique({
    where: { code: 'en' },
    include: { translations: true },
  })

  if (!english) throw new Error('Base English language is missing')

  const translatedRows = []

  for (const translation of english.translations) {
    const result = await translateText(translation.value, language.code, 'en')

    translatedRows.push(
      prisma.appTranslation.upsert({
        where: {
          languageId_translationKey: {
            languageId: language.id,
            translationKey: translation.translationKey,
          },
        },
        create: {
          languageId: language.id,
          translationKey: translation.translationKey,
          value: result.translatedText,
          isAutoTranslated: true,
        },
        update: {
          value: result.translatedText,
          isAutoTranslated: true,
        },
      })
    )
  }

  await prisma.$transaction(translatedRows)

  await prisma.appLanguage.update({
    where: { id: language.id },
    data: {
      autoTranslateReady: true,
      lastTranslatedAt: new Date(),
    },
  })
}

export async function getLanguageAdminSnapshot() {
  await ensureLocalizationSeeded()
  const [languages, totalKeys] = await Promise.all([
    prisma.appLanguage.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { translations: true },
        },
      },
    }),
    prisma.appTranslation.count({
      where: {
        language: {
          code: 'en',
        },
      },
    }),
  ])

  return {
    baseLanguage: 'en',
    totalKeys,
    languages: languages.map((language) => ({
      id: language.id,
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      isDefault: language.isDefault,
      isActive: language.isActive,
      isRtl: language.isRtl,
      autoTranslateReady: language.autoTranslateReady,
      lastTranslatedAt: language.lastTranslatedAt?.toISOString() || null,
      translationCount: language._count.translations,
    })),
  }
}
