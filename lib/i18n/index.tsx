'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANGUAGE_CODES } from '@/lib/i18n/catalog'

export const SUPPORTED_LANGUAGES = DEFAULT_LANGUAGE_CODES
export type Language = string

type LanguageOption = {
  id: string
  code: string
  name: string
  nativeName?: string | null
  isDefault: boolean
  isActive: boolean
  isRtl: boolean
  autoTranslateReady: boolean
  lastTranslatedAt: string | null
}

type TranslationPayload = {
  languages: LanguageOption[]
  defaultLanguage: string
  activeLanguage: string
  translations: Record<string, string>
}

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
  availableLanguages: LanguageOption[]
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readStoredLanguage() {
  return typeof window !== 'undefined' ? window.localStorage.getItem('kgt-language') : null
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [defaultLanguage, setDefaultLanguage] = useState('en')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = readStoredLanguage()
    if (stored) setLanguageState(stored)
  }, [])

  useEffect(() => {
    let active = true
    setIsLoading(true)

    fetch(`/api/i18n?language=${encodeURIComponent(language)}`, {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load translations')
        return response.json() as Promise<{ data?: TranslationPayload }>
      })
      .then((payload) => {
        if (!active) return
        const data = payload.data
        const languages = data?.languages || []
        const fallbackLanguage = languages.find((item) => item.isDefault)?.code || data?.defaultLanguage || 'en'
        const isSupported = languages.some((item) => item.code === language)
        const resolvedLanguage = isSupported ? language : fallbackLanguage

        setAvailableLanguages(languages)
        setDefaultLanguage(fallbackLanguage)
        setTranslations(data?.translations || {})

        if (resolvedLanguage !== language) {
          setLanguageState(resolvedLanguage)
          return
        }

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('kgt-language', resolvedLanguage)
          const selected = languages.find((item) => item.code === resolvedLanguage)
          document.documentElement.lang = resolvedLanguage
          document.documentElement.dir = selected?.isRtl ? 'rtl' : 'ltr'
        }
      })
      .catch(() => {
        if (!active) return
        setAvailableLanguages(
          DEFAULT_LANGUAGE_CODES.map((code) => ({
            id: code,
            code,
            name: code.toUpperCase(),
            nativeName: code.toUpperCase(),
            isDefault: code === 'en',
            isActive: true,
            isRtl: ['ar', 'ur', 'fa'].includes(code),
            autoTranslateReady: code === 'en',
            lastTranslatedAt: null,
          }))
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      availableLanguages,
      isLoading,
      t: (key: string) => translations[key] || key,
    }),
    [availableLanguages, isLoading, language, translations]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
