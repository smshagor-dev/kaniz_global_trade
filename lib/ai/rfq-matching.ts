import { Prisma, VerificationStatus } from '@prisma/client'
import prisma from '@/lib/db/prisma'
import { getStoredAIProviders, type StoredAIProvider } from '@/lib/ai/provider-registry'
import { getSettingsMap } from '@/lib/settings/system'

const CERTIFICATION_KEYWORDS = [
  'organic',
  'gots',
  'oekotex',
  'oeko-tex',
  'iso',
  'ce',
  'fda',
  'halal',
  'kosher',
  'fair trade',
  'bci',
  'recycled',
] as const

type MatchResponse = {
  rfq: {
    id: string
    productName: string
    categoryName: string | null
    destinationCountry: string | null
    signals: string[]
    generatedAt: string | null
    expiresAt: string | null
    strategy: string
    usedAI: boolean
    providersUsed: string[]
    cached: boolean
    summary: string | null
  }
  matches: Array<{
    companyId: string
    companyName: string
    companySlug: string
    companyLogo: string | null
    country: { name: string | null; flag: string | null } | null
    isVerified: boolean
    verificationStatus: string
    score: number
    baseScore: number
    aiScoreBonus: number
    reasons: string[]
    product: {
      id: string
      name: string
      slug: string
      category: string
      shortDescription: string | null
      moq: number | null
      moqUnit: string | null
      leadTime: string | null
    }
  }>
}

type QueryExpansionResponse = {
  summary?: string
  signals?: string[]
  rankedCandidates?: Array<{
    companyId: string
    productId?: string
    boost?: number
    reasons?: string[]
  }>
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

type ClaudeGenerateResponse = {
  content?: Array<{ type?: string; text?: string }>
}

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>
}

type CandidateScore = {
  companyId: string
  companyName: string
  companySlug: string
  companyLogo: string | null
  country: { name: string | null; flag: string | null } | null
  isVerified: boolean
  verificationStatus: VerificationStatus
  isPremium: boolean
  destinationMatch: boolean
  score: number
  keywordOverlap: number
  companySignals: string[]
  productSignalMatches: string[]
  product: {
    id: string
    name: string
    slug: string
    category: string
    shortDescription: string | null
    moq: number | null
    moqUnit: string | null
    leadTime: string | null
  }
  reasons: string[]
}

type EnrichedCandidate = CandidateScore & {
  baseScore: number
  aiScoreBonus: number
}

type MatchingSettings = {
  enabled: boolean
  maxCompanies: number
  resultLimit: number
  minScore: number
  refreshHours: number
  notifyLimit: number
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')
}

function tokenize(text: string) {
  return normalize(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
}

function countOverlap(source: string[], target: string[]) {
  const targetSet = new Set(target)
  return source.reduce((score, token) => score + (targetSet.has(token) ? 1 : 0), 0)
}

function extractSignals(text: string) {
  const normalized = normalize(text)
  return CERTIFICATION_KEYWORDS.filter((keyword) => normalized.includes(keyword)) as string[]
}

function parseJsonArray(value: string | null | undefined) {
  if (!value) return [] as string[]
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

async function getMatchingSettings(): Promise<MatchingSettings> {
  const settings = await getSettingsMap([
    'AI_MATCHING_ENABLED',
    'AI_MATCHING_MAX_COMPANIES',
    'AI_MATCHING_RESULT_LIMIT',
    'AI_MATCHING_MIN_SCORE',
    'AI_MATCHING_REFRESH_HOURS',
    'AI_MATCHING_NOTIFY_LIMIT',
  ])

  return {
    enabled: settings.AI_MATCHING_ENABLED !== 'false',
    maxCompanies: clamp(Number(settings.AI_MATCHING_MAX_COMPANIES || '80') || 80, 20, 200),
    resultLimit: clamp(Number(settings.AI_MATCHING_RESULT_LIMIT || '12') || 12, 3, 30),
    minScore: clamp(Number(settings.AI_MATCHING_MIN_SCORE || '20') || 20, 0, 200),
    refreshHours: clamp(Number(settings.AI_MATCHING_REFRESH_HOURS || '12') || 12, 1, 168),
    notifyLimit: clamp(Number(settings.AI_MATCHING_NOTIFY_LIMIT || '20') || 20, 1, 50),
  }
}

async function generateGeminiJSON<T>(provider: StoredAIProvider, prompt: string): Promise<T | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${provider.textModel}:generateContent?key=${encodeURIComponent(provider.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini RFQ matching failed with status ${response.status}`)
  }

  const payload = await response.json() as GeminiGenerateResponse
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text
  return text ? JSON.parse(text) as T : null
}

async function generateClaudeJSON<T>(provider: StoredAIProvider, prompt: string): Promise<T | null> {
  const endpoint = `${provider.baseUrl?.trim() || 'https://api.anthropic.com'}/v1/messages`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: provider.textModel,
      max_tokens: 900,
      temperature: 0.2,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Claude RFQ matching failed with status ${response.status}`)
  }

  const payload = await response.json() as ClaudeGenerateResponse
  const text = payload.content?.find((item) => item.type === 'text')?.text
  return text ? JSON.parse(text) as T : null
}

async function generateOpenAIJSON<T>(provider: StoredAIProvider, prompt: string): Promise<T | null> {
  const endpoint = `${provider.baseUrl?.trim() || 'https://api.openai.com'}/v1/chat/completions`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.textModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`ChatGPT RFQ matching failed with status ${response.status}`)
  }

  const payload = await response.json() as OpenAIChatResponse
  const text = payload.choices?.[0]?.message?.content
  return text ? JSON.parse(text) as T : null
}

async function analyzeWithProvider(provider: StoredAIProvider, prompt: string) {
  if (provider.provider === 'gemini') return generateGeminiJSON<QueryExpansionResponse>(provider, prompt)
  if (provider.provider === 'claude') return generateClaudeJSON<QueryExpansionResponse>(provider, prompt)
  return generateOpenAIJSON<QueryExpansionResponse>(provider, prompt)
}

async function getActiveProviders() {
  return (await getStoredAIProviders()).filter((item) => item.enabled && item.apiKey)
}

async function loadRfqWithRelations(rfqId: string) {
  return prisma.rFQ.findUnique({
    where: { id: rfqId },
    include: {
      category: { select: { id: true, name: true } },
      destinationCountry: { select: { id: true, name: true } },
    },
  })
}

async function computeDeterministicMatches(rfqId: string, settings: MatchingSettings) {
  const rfq = await loadRfqWithRelations(rfqId)
  if (!rfq) return null

  const rfqText = [rfq.productName, rfq.description, rfq.category?.name].filter(Boolean).join(' ')
  const rfqTokens = tokenize(rfqText)
  const rfqSignals = extractSignals(rfqText)

  const companies = await prisma.company.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      products: {
        some: {
          status: 'APPROVED',
          deletedAt: null,
        },
      },
    },
    take: settings.maxCompanies,
    include: {
      country: { select: { name: true, flag: true } },
      certificates: { select: { name: true, issuedBy: true } },
      markets: { include: { country: { select: { id: true, name: true } } }, take: 10 },
      products: {
        where: { status: 'APPROVED', deletedAt: null },
        take: 12,
        include: {
          category: { select: { id: true, name: true } },
          certificates: { select: { name: true } },
        },
      },
    },
  })

  const scoredCandidates = companies.map((company) => {
      const companyCertText = company.certificates.map((cert) => `${cert.name} ${cert.issuedBy || ''}`).join(' ')
      const destinationMatch = rfq.destinationCountryId
        ? company.markets.some((market) => market.countryId === rfq.destinationCountryId)
        : false

      const productScores = company.products.map((product) => {
        const productText = [
          product.name,
          product.tags,
          product.shortDescription,
          product.description,
          product.category.name,
          product.certificates.map((cert) => cert.name).join(' '),
        ]
          .filter(Boolean)
          .join(' ')

        const productTokens = tokenize(productText)
        const keywordOverlap = countOverlap(rfqTokens, productTokens)
        const signalMatches = rfqSignals.filter((signal) => normalize(productText).includes(signal))
        const categoryMatch = rfq.categoryId && product.categoryId === rfq.categoryId ? 18 : 0
        const viewsBoost = Math.min(product.totalViews / 100, 8)
        const inquiryBoost = Math.min(product.totalInquiries / 40, 6)

        const score =
          keywordOverlap * 7 +
          signalMatches.length * 14 +
          categoryMatch +
          (product.isFeatured ? 4 : 0) +
          (product.isVerified ? 5 : 0) +
          viewsBoost +
          inquiryBoost

        return {
          product,
          score,
          signalMatches,
          keywordOverlap,
        }
      })

      const bestProduct = productScores.sort((a, b) => b.score - a.score)[0]
      const companySignals = rfqSignals.filter((signal) => normalize(companyCertText).includes(signal))
      const companyScore =
        (bestProduct?.score || 0) +
        companySignals.length * 10 +
        (company.isVerified ? 10 : 0) +
        (company.isPremium ? 6 : 0) +
        (destinationMatch ? 8 : 0) +
        Math.min(company.totalInquiries / 20, 6)

      if (!bestProduct || companyScore < settings.minScore) return null

      const reasons = [
        rfq.category?.name && bestProduct.product.category.name === rfq.category.name
          ? `Strong category fit in ${rfq.category.name}`
          : null,
        bestProduct.signalMatches.length
          ? `Product mentions ${bestProduct.signalMatches.join(', ')}`
          : null,
        companySignals.length
          ? `Supplier certificates include ${companySignals.join(', ')}`
          : null,
        destinationMatch ? 'Supplier already exports to destination market' : null,
        company.isVerified ? 'Supplier is verified on the platform' : null,
        company.isPremium ? 'Supplier has premium marketplace visibility' : null,
      ].filter((item): item is string => Boolean(item))

      return {
        companyId: company.id,
        companyName: company.name,
        companySlug: company.slug,
        companyLogo: company.logo,
        country: company.country ? { name: company.country.name || null, flag: company.country.flag || null } : null,
        isVerified: company.isVerified,
        verificationStatus: company.verificationStatus,
        isPremium: company.isPremium,
        destinationMatch,
        score: Math.round(companyScore),
        keywordOverlap: bestProduct.keywordOverlap,
        companySignals,
        productSignalMatches: bestProduct.signalMatches,
        product: {
          id: bestProduct.product.id,
          name: bestProduct.product.name,
          slug: bestProduct.product.slug,
          category: bestProduct.product.category.name,
          shortDescription: bestProduct.product.shortDescription,
          moq: bestProduct.product.moq != null ? Number(bestProduct.product.moq) : null,
          moqUnit: bestProduct.product.moqUnit,
          leadTime: bestProduct.product.leadTime,
        },
        reasons,
      } satisfies CandidateScore
    })

  const scored: CandidateScore[] = scoredCandidates
    .filter((item): item is CandidateScore => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, settings.resultLimit)

  return {
    rfq,
    rfqSignals,
    matches: scored,
  }
}

async function rerankWithAi(input: {
  rfq: Awaited<ReturnType<typeof loadRfqWithRelations>>
  rfqSignals: string[]
  candidates: CandidateScore[]
}) {
  const providers = await getActiveProviders()
  if (!providers.length || !input.rfq || !input.candidates.length) {
    return {
      strategy: 'DETERMINISTIC',
      usedAI: false,
      providersUsed: [] as string[],
      summary: null as string | null,
      signals: input.rfqSignals,
        matches: input.candidates.map<EnrichedCandidate>((item) => ({ ...item, baseScore: item.score, aiScoreBonus: 0 })),
    }
  }

  const prompt = [
    'You rank RFQ-to-supplier matches for a B2B marketplace.',
    'Return strict JSON with keys summary, signals, rankedCandidates.',
    'signals must be a short array of normalized market-relevant requirements.',
    'rankedCandidates must be an array of objects with companyId, productId, boost, reasons.',
    'boost must be an integer from -15 to 15 and should only adjust existing deterministic scores.',
    `RFQ: ${JSON.stringify({
      productName: input.rfq.productName,
      category: input.rfq.category?.name || null,
      description: input.rfq.description || '',
      quantity: input.rfq.quantity,
      unit: input.rfq.unit || null,
      destinationCountry: input.rfq.destinationCountry?.name || null,
      knownSignals: input.rfqSignals,
    })}`,
    `Candidates: ${JSON.stringify(
      input.candidates.map((item) => ({
        companyId: item.companyId,
        companyName: item.companyName,
        isVerified: item.isVerified,
        isPremium: item.isPremium,
        destinationMatch: item.destinationMatch,
        currentScore: item.score,
        product: item.product,
        reasons: item.reasons,
      }))
    )}`,
  ].join('\n')

  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      const result = await analyzeWithProvider(provider, prompt)
      if (!result) {
        throw new Error(`${provider.label} returned empty RFQ matching output`)
      }
      return { provider, result }
    })
  )

  const successful = settled
    .filter((item): item is PromiseFulfilledResult<{ provider: StoredAIProvider; result: QueryExpansionResponse }> => item.status === 'fulfilled')
    .map((item) => item.value)

  if (!successful.length) {
    return {
      strategy: 'DETERMINISTIC',
      usedAI: false,
      providersUsed: [] as string[],
      summary: null as string | null,
      signals: input.rfqSignals,
      matches: input.candidates.map<EnrichedCandidate>((item) => ({ ...item, baseScore: item.score, aiScoreBonus: 0 })),
    }
  }

  const boosts = new Map<string, { total: number; count: number; reasons: Set<string> }>()
  for (const item of successful) {
    for (const candidate of item.result.rankedCandidates || []) {
      if (!candidate.companyId) continue
      const current = boosts.get(candidate.companyId) || { total: 0, count: 0, reasons: new Set<string>() }
      current.total += clamp(Math.round(Number(candidate.boost || 0)), -15, 15)
      current.count += 1
      for (const reason of candidate.reasons || []) {
        if (typeof reason === 'string' && reason.trim()) current.reasons.add(reason.trim())
      }
      boosts.set(candidate.companyId, current)
    }
  }

  const mergedSignals = Array.from(
    new Set(
      successful
        .flatMap((item) => item.result.signals || [])
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 1)
        .map((item) => item.trim().toLowerCase())
        .concat(input.rfqSignals)
    )
  )

  const summary =
    successful
      .map((item) => item.result.summary?.trim())
      .find((item): item is string => Boolean(item)) || null

  const matches = input.candidates
    .map<EnrichedCandidate>((item) => {
      const ai = boosts.get(item.companyId)
      const aiScoreBonus = ai ? Math.round(ai.total / ai.count) : 0
      return {
        ...item,
        baseScore: item.score,
        aiScoreBonus,
        score: Math.max(0, item.score + aiScoreBonus),
        reasons: ai ? Array.from(new Set([...item.reasons, ...Array.from(ai.reasons)])).slice(0, 6) : item.reasons,
      }
    })
    .sort((a, b) => b.score - a.score)

  return {
    strategy: 'AI_ENRICHED',
    usedAI: true,
    providersUsed: successful.map((item) => item.provider.label),
    summary,
    signals: mergedSignals,
    matches,
  }
}

async function persistSnapshot(input: {
  rfqId: string
  rfqSignals: string[]
  strategy: string
  usedAI: boolean
  providersUsed: string[]
  summary: string | null
  candidateCount: number
  refreshHours: number
  matches: EnrichedCandidate[]
}) {
  const expiresAt = new Date(Date.now() + input.refreshHours * 60 * 60 * 1000)

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const snapshot = await tx.rfqMatchSnapshot.create({
      data: {
        rfqId: input.rfqId,
        status: 'READY',
        strategy: input.strategy,
        usedAi: input.usedAI,
        providersUsed: JSON.stringify(input.providersUsed),
        summary: input.summary,
        rfqSignals: JSON.stringify(input.rfqSignals),
        candidateCount: input.candidateCount,
        matchCount: input.matches.length,
        expiresAt,
      },
    })

    if (input.matches.length) {
      await tx.rfqMatchResult.createMany({
        data: input.matches.map((item, index) => ({
          snapshotId: snapshot.id,
          rfqId: input.rfqId,
          companyId: item.companyId,
          productId: item.product.id,
          rank: index + 1,
          score: item.score,
          baseScore: item.baseScore,
          aiScoreBonus: item.aiScoreBonus,
          keywordOverlap: item.keywordOverlap,
          destinationMatch: item.destinationMatch,
          verifiedSupplier: item.isVerified,
          premiumSupplier: item.isPremium,
          signalMatches: JSON.stringify([...item.productSignalMatches, ...item.companySignals]),
          reasons: JSON.stringify(item.reasons),
        })),
      })
    }

    return snapshot
  })
}

async function loadCachedSnapshot(rfqId: string) {
  return prisma.rfqMatchSnapshot.findFirst({
    where: { rfqId, status: 'READY' },
    orderBy: { generatedAt: 'desc' },
    include: {
      results: {
        orderBy: { rank: 'asc' },
        include: {
          company: {
            include: {
              country: { select: { name: true, flag: true } },
            },
          },
          product: {
            include: {
              category: { select: { name: true } },
            },
          },
        },
      },
      rfq: {
        include: {
          category: { select: { name: true } },
          destinationCountry: { select: { name: true } },
        },
      },
    },
  })
}

function formatSnapshotResponse(snapshot: NonNullable<Awaited<ReturnType<typeof loadCachedSnapshot>>>, cached: boolean): MatchResponse {
  return {
    rfq: {
      id: snapshot.rfq.id,
      productName: snapshot.rfq.productName,
      categoryName: snapshot.rfq.category?.name || null,
      destinationCountry: snapshot.rfq.destinationCountry?.name || null,
      signals: parseJsonArray(snapshot.rfqSignals),
      generatedAt: snapshot.generatedAt.toISOString(),
      expiresAt: snapshot.expiresAt?.toISOString() || null,
      strategy: snapshot.strategy,
      usedAI: snapshot.usedAi,
      providersUsed: parseJsonArray(snapshot.providersUsed),
      cached,
      summary: snapshot.summary || null,
    },
    matches: snapshot.results.map((result: NonNullable<typeof snapshot.results>[number]) => ({
      companyId: result.companyId,
      companyName: result.company.name,
      companySlug: result.company.slug,
      companyLogo: result.company.logo,
      country: result.company.country ? { name: result.company.country.name || null, flag: result.company.country.flag || null } : null,
      isVerified: result.verifiedSupplier,
      verificationStatus: result.company.verificationStatus,
      score: result.score,
      baseScore: result.baseScore,
      aiScoreBonus: result.aiScoreBonus,
      reasons: parseJsonArray(result.reasons),
      product: {
        id: result.product.id,
        name: result.product.name,
        slug: result.product.slug,
        category: result.product.category.name,
        shortDescription: result.product.shortDescription,
        moq: result.product.moq != null ? Number(result.product.moq) : null,
        moqUnit: result.product.moqUnit,
        leadTime: result.product.leadTime,
      },
    })),
  }
}

export async function getSmartMatchesForRFQ(
  rfqId: string,
  options?: { limit?: number; forceRefresh?: boolean }
) {
  const settings = await getMatchingSettings()
  const cachedSnapshot = await loadCachedSnapshot(rfqId)

  if (
    cachedSnapshot &&
    !options?.forceRefresh &&
    (!cachedSnapshot.expiresAt || cachedSnapshot.expiresAt > new Date())
  ) {
    const payload = formatSnapshotResponse(cachedSnapshot, true)
    return {
      ...payload,
      matches: typeof options?.limit === 'number' ? payload.matches.slice(0, options.limit) : payload.matches,
    }
  }

  const deterministic = await computeDeterministicMatches(rfqId, settings)
  if (!deterministic) return null

  const limit = options?.limit ?? settings.resultLimit
  const enriched = settings.enabled
    ? await rerankWithAi({
        rfq: deterministic.rfq,
        rfqSignals: deterministic.rfqSignals,
        candidates: deterministic.matches,
      })
    : {
        strategy: 'DETERMINISTIC',
        usedAI: false,
        providersUsed: [] as string[],
        summary: null as string | null,
        signals: deterministic.rfqSignals,
        matches: deterministic.matches.map<EnrichedCandidate>((item) => ({ ...item, baseScore: item.score, aiScoreBonus: 0 })),
      }

  const persisted = await persistSnapshot({
    rfqId,
    rfqSignals: enriched.signals,
    strategy: enriched.strategy,
    usedAI: enriched.usedAI,
    providersUsed: enriched.providersUsed,
    summary: enriched.summary,
    candidateCount: deterministic.matches.length,
    refreshHours: settings.refreshHours,
    matches: enriched.matches.slice(0, limit),
  })

  return {
    rfq: {
      id: deterministic.rfq.id,
      productName: deterministic.rfq.productName,
      categoryName: deterministic.rfq.category?.name || null,
      destinationCountry: deterministic.rfq.destinationCountry?.name || null,
      signals: enriched.signals,
      generatedAt: persisted.generatedAt.toISOString(),
      expiresAt: persisted.expiresAt?.toISOString() || null,
      strategy: enriched.strategy,
      usedAI: enriched.usedAI,
      providersUsed: enriched.providersUsed,
      cached: false,
      summary: enriched.summary,
    },
    matches: enriched.matches.slice(0, limit).map((item: EnrichedCandidate) => ({
      companyId: item.companyId,
      companyName: item.companyName,
      companySlug: item.companySlug,
      companyLogo: item.companyLogo,
      country: item.country,
      isVerified: item.isVerified,
      verificationStatus: item.verificationStatus,
      score: item.score,
      baseScore: item.baseScore,
      aiScoreBonus: item.aiScoreBonus,
      reasons: item.reasons,
      product: item.product,
    })),
  } satisfies MatchResponse
}

export async function getAiMatchedSupplierOwnersForRFQ(rfqId: string) {
  const settings = await getMatchingSettings()
  const matchPayload = await getSmartMatchesForRFQ(rfqId, { limit: settings.notifyLimit })
  if (!matchPayload?.matches.length) return []

  const companies = await prisma.company.findMany({
    where: {
      id: { in: matchPayload.matches.map((item) => item.companyId) },
    },
    include: {
      companyUsers: {
        where: { isPrimary: true },
        include: { user: { select: { email: true, firstName: true, id: true } } },
        take: 1,
      },
    },
  })

  const companyMap = new Map(companies.map((item) => [item.id, item]))
  return matchPayload.matches
    .map((match) => {
      const company = companyMap.get(match.companyId)
      const owner = company?.companyUsers[0]
      if (!company || !owner) return null
      return {
        rank: matchPayload.matches.findIndex((item) => item.companyId === match.companyId) + 1,
        score: match.score,
        match,
        company,
        owner,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, settings.notifyLimit)
}
