import prisma from '@/lib/db/prisma'
import { getSettingValue } from '@/lib/settings/system'

export type PartnerInput = {
  id?: string
  type: 'FINANCING' | 'INSURANCE'
  code: string
  name: string
  description?: string
  website?: string
  contactEmail?: string
  apiBaseUrl?: string
  apiKey?: string
  apiSecret?: string
  accessToken?: string
  metadata?: string
  isDefault?: boolean
  isActive?: boolean
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function serializePartner(
  partner: {
  id: string
  type: 'FINANCING' | 'INSURANCE'
  code: string
  name: string
  slug: string
  description: string | null
  website: string | null
  contactEmail: string | null
  apiBaseUrl: string | null
  apiKey: string | null
  apiSecret: string | null
  accessToken: string | null
  metadata: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    financingRequests?: number
    insurancePolicies?: number
  }
},
  options?: { includeSecrets?: boolean }
) {
  const includeSecrets = options?.includeSecrets ?? false

  return {
    id: partner.id,
    type: partner.type,
    code: partner.code,
    name: partner.name,
    slug: partner.slug,
    description: partner.description,
    website: partner.website,
    contactEmail: partner.contactEmail,
    apiBaseUrl: partner.apiBaseUrl,
    apiKey: includeSecrets ? partner.apiKey || '' : undefined,
    apiSecret: includeSecrets ? partner.apiSecret || '' : undefined,
    accessToken: includeSecrets ? partner.accessToken || '' : undefined,
    metadata: partner.metadata || '',
    isDefault: partner.isDefault,
    isActive: partner.isActive,
    hasApiKey: !!partner.apiKey,
    hasApiSecret: !!partner.apiSecret,
    hasAccessToken: !!partner.accessToken,
    requestCount: (partner._count?.financingRequests || 0) + (partner._count?.insurancePolicies || 0),
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  }
}

export async function ensureServicePartnersSeeded() {
  const financingDefault = await getSettingValue('DEFAULT_FINANCING_PARTNER')
  const insuranceDefault = await getSettingValue('DEFAULT_INSURANCE_PROVIDER')

  const seeds = [
    {
      type: 'FINANCING' as const,
      code: 'GLOBAL_TRADE_CAPITAL',
      name: financingDefault || 'Global Trade Capital',
      description: 'Primary working-capital and trade finance partner for supplier order growth.',
    },
    {
      type: 'INSURANCE' as const,
      code: 'ALLIANZ_TRADE',
      name: insuranceDefault || 'Allianz Trade',
      description: 'Default cargo and trade insurance underwriting partner.',
    },
  ]

  await prisma.$transaction(async (tx) => {
    for (const seed of seeds) {
      await tx.servicePartner.upsert({
        where: { code: seed.code },
        create: {
          ...seed,
          slug: slugify(`${seed.type}-${seed.name}`),
          isDefault: true,
          isActive: true,
        },
        update: {
          name: seed.name,
          description: seed.description,
          isActive: true,
        },
      })
    }
  })
}

export async function listServicePartners(type?: 'FINANCING' | 'INSURANCE', includeInactive = false) {
  await ensureServicePartnersSeeded()
  const partners = await prisma.servicePartner.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          financingRequests: true,
          insurancePolicies: true,
        },
      },
    },
  })

  return partners.map((partner) => serializePartner(partner))
}

export async function getDefaultPartner(type: 'FINANCING' | 'INSURANCE') {
  await ensureServicePartnersSeeded()
  const partner = await prisma.servicePartner.findFirst({
    where: { type, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  return partner ? serializePartner(partner) : null
}

export async function listAdminServicePartners(type?: 'FINANCING' | 'INSURANCE', includeInactive = false) {
  await ensureServicePartnersSeeded()
  const partners = await prisma.servicePartner.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          financingRequests: true,
          insurancePolicies: true,
        },
      },
    },
  })

  return partners.map((partner) => serializePartner(partner, { includeSecrets: true }))
}

export async function upsertServicePartner(input: PartnerInput) {
  await ensureServicePartnersSeeded()

  const code = input.code.trim().toUpperCase()
  const name = input.name.trim()
  const type = input.type
  const slug = slugify(`${type}-${name}`)

  const partner = input.id
    ? await prisma.servicePartner.update({
        where: { id: input.id },
        data: {
          type,
          code,
          name,
          slug,
          description: input.description?.trim() || null,
          website: input.website?.trim() || null,
          contactEmail: input.contactEmail?.trim() || null,
          apiBaseUrl: input.apiBaseUrl?.trim() || null,
          apiKey: input.apiKey?.trim() || null,
          apiSecret: input.apiSecret?.trim() || null,
          accessToken: input.accessToken?.trim() || null,
          metadata: input.metadata?.trim() || null,
          isActive: input.isActive ?? true,
        },
      })
    : await prisma.servicePartner.create({
        data: {
          type,
          code,
          name,
          slug,
          description: input.description?.trim() || null,
          website: input.website?.trim() || null,
          contactEmail: input.contactEmail?.trim() || null,
          apiBaseUrl: input.apiBaseUrl?.trim() || null,
          apiKey: input.apiKey?.trim() || null,
          apiSecret: input.apiSecret?.trim() || null,
          accessToken: input.accessToken?.trim() || null,
          metadata: input.metadata?.trim() || null,
          isDefault: false,
          isActive: input.isActive ?? true,
        },
      })

  if (input.isDefault) {
    await prisma.$transaction([
      prisma.servicePartner.updateMany({
        where: { type, id: { not: partner.id } },
        data: { isDefault: false },
      }),
      prisma.servicePartner.update({
        where: { id: partner.id },
        data: { isDefault: true },
      }),
    ])
  }

  const refreshed = await prisma.servicePartner.findUnique({
    where: { id: partner.id },
    include: {
      _count: {
        select: {
          financingRequests: true,
          insurancePolicies: true,
        },
      },
    },
  })

  return refreshed ? serializePartner(refreshed, { includeSecrets: true }) : null
}

export async function deleteServicePartner(id: string) {
  await ensureServicePartnersSeeded()
  const existing = await prisma.servicePartner.findUnique({ where: { id } })
  if (!existing) return null

  const usageCount = await prisma.$transaction([
    prisma.financingRequest.count({ where: { partnerId: id } }),
    prisma.insurancePolicy.count({ where: { partnerId: id } }),
  ])

  if (usageCount[0] > 0 || usageCount[1] > 0) {
    const archived = await prisma.servicePartner.update({
      where: { id },
      data: { isActive: false, isDefault: false },
    })
    return { mode: 'archived', partner: serializePartner(archived, { includeSecrets: true }) }
  }

  await prisma.servicePartner.delete({ where: { id } })
  return { mode: 'deleted' as const }
}
