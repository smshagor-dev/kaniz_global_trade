import { getSettingsMap } from '@/lib/settings/system'

type SearchScope = 'products' | 'companies' | 'global'

type QueryExpansionResponse = {
  normalizedQuery?: string
  intent?: string
  searchTerms?: string[]
  note?: string
}

type ImageAnalysisResponse = {
  searchQuery?: string
  extractedTags?: string[]
  note?: string
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

const DEFAULT_TEXT_MODEL = 'gemini-2.0-flash'
const DEFAULT_IMAGE_MODEL = 'gemini-2.0-flash'

async function getGoogleAISettings() {
  return getSettingsMap([
    'GOOGLE_AI_SEARCH_ENABLED',
    'GOOGLE_GEMINI_API_KEY',
    'GOOGLE_AI_TEXT_MODEL',
    'GOOGLE_AI_IMAGE_MODEL',
    'GOOGLE_AI_SEARCH_MAX_TERMS',
  ])
}

function normalizeTerms(values: string[], maxTerms: number) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
        .flatMap((value) => value.split(/[\s,]+/))
        .map((value) => value.replace(/[^a-z0-9-]/gi, '').trim())
        .filter((value) => value.length > 1)
    )
  ).slice(0, maxTerms)
}

async function generateJSON<T>({
  model,
  apiKey,
  parts,
}: {
  model: string
  apiKey: string
  parts: Array<Record<string, unknown>>
}): Promise<T | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(`Google AI request failed with status ${response.status}`)
  }

  const payload = await response.json() as GeminiGenerateResponse
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null

  return JSON.parse(text) as T
}

export async function expandMarketplaceSearchQuery(query: string, scope: SearchScope) {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return {
      normalizedQuery: '',
      searchTerms: [] as string[],
      note: 'Empty query',
      usedAI: false,
    }
  }

  const settings = await getGoogleAISettings()
  const enabled = settings.GOOGLE_AI_SEARCH_ENABLED === 'true'
  const apiKey = settings.GOOGLE_GEMINI_API_KEY
  const model = settings.GOOGLE_AI_TEXT_MODEL || DEFAULT_TEXT_MODEL
  const maxTerms = Math.max(4, Math.min(12, Number(settings.GOOGLE_AI_SEARCH_MAX_TERMS || '8')))

  if (!enabled || !apiKey) {
    return {
      normalizedQuery: trimmedQuery,
      searchTerms: normalizeTerms([trimmedQuery], maxTerms),
      note: !enabled ? 'Google AI search disabled in Kaniz Global Trade settings' : 'Google AI key missing',
      usedAI: false,
    }
  }

  try {
    const result = await generateJSON<QueryExpansionResponse>({
      model,
      apiKey,
      parts: [
        {
          text:
            `You improve search queries for a B2B marketplace. ` +
            `Return JSON with keys normalizedQuery, intent, searchTerms, note. ` +
            `searchTerms must contain 4 to ${maxTerms} short marketplace-friendly terms or phrases. ` +
            `Prefer product names, materials, industries, supplier types, and category hints. ` +
            `Scope is ${scope}. Query: ${trimmedQuery}`,
        },
      ],
    })

    const terms = normalizeTerms(
      [trimmedQuery, result?.normalizedQuery || '', ...(result?.searchTerms || [])],
      maxTerms
    )

    return {
      normalizedQuery: result?.normalizedQuery?.trim() || trimmedQuery,
      searchTerms: terms.length ? terms : normalizeTerms([trimmedQuery], maxTerms),
      note: result?.note || 'Google AI query expansion applied',
      usedAI: true,
    }
  } catch (error) {
    console.error('Google AI text search expansion failed:', error)
    return {
      normalizedQuery: trimmedQuery,
      searchTerms: normalizeTerms([trimmedQuery], maxTerms),
      note: 'Google AI expansion failed, using direct keyword search',
      usedAI: false,
    }
  }
}

export async function analyzeMarketplaceSearchImage(input: {
  buffer: Buffer
  mimeType: string
  fileName: string
  hint?: string
}) {
  const settings = await getGoogleAISettings()
  const enabled = settings.GOOGLE_AI_SEARCH_ENABLED === 'true'
  const apiKey = settings.GOOGLE_GEMINI_API_KEY
  const model = settings.GOOGLE_AI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL
  const maxTerms = Math.max(4, Math.min(12, Number(settings.GOOGLE_AI_SEARCH_MAX_TERMS || '8')))

  const fallbackTerms = normalizeTerms([input.fileName, input.hint || ''], maxTerms)

  if (!enabled || !apiKey) {
    return {
      extractedTags: fallbackTerms,
      searchQuery: fallbackTerms.join(' '),
      note: !enabled ? 'Google AI image search disabled in Kaniz Global Trade settings' : 'Google AI key missing',
      usedAI: false,
    }
  }

  try {
    const result = await generateJSON<ImageAnalysisResponse>({
      model,
      apiKey,
      parts: [
        {
          text:
            `You analyze product images for a global B2B marketplace. ` +
            `Return JSON with keys searchQuery, extractedTags, note. ` +
            `extractedTags must contain 4 to ${maxTerms} concise product-identifying keywords or short phrases. ` +
            `Focus on likely product type, material, usage, and industry category. ` +
            `Optional user hint: ${input.hint?.trim() || 'none'}.`,
        },
        {
          inlineData: {
            mimeType: input.mimeType,
            data: input.buffer.toString('base64'),
          },
        },
      ],
    })

    const extractedTags = normalizeTerms(
      [result?.searchQuery || '', ...(result?.extractedTags || []), input.hint || '', input.fileName],
      maxTerms
    )

    return {
      extractedTags,
      searchQuery: result?.searchQuery?.trim() || extractedTags.join(' '),
      note: result?.note || 'Google AI analyzed the image and generated marketplace search tags.',
      usedAI: true,
    }
  } catch (error) {
    console.error('Google AI image search analysis failed:', error)
    return {
      extractedTags: fallbackTerms,
      searchQuery: fallbackTerms.join(' '),
      note: 'Google AI image analysis failed, using fallback keyword extraction.',
      usedAI: false,
    }
  }
}
