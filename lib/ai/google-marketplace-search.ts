import { AI_PROVIDER_CATALOG, getStoredAIProviders, StoredAIProvider } from '@/lib/ai/provider-registry'
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

type ClaudeGenerateResponse = {
  content?: Array<{
    type?: string
    text?: string
  }>
}

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type ProviderExecutionResult<T> = {
  providerId: string
  provider: StoredAIProvider['provider']
  label: string
  result: T
}

async function getAISettings() {
  return getSettingsMap([
    'AI_MULTI_AGENT_ENABLED',
    'AI_MULTI_AGENT_MAX_TERMS',
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

async function generateGeminiJSON<T>({
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
    throw new Error(`Gemini request failed with status ${response.status}`)
  }

  const payload = await response.json() as GeminiGenerateResponse
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null
  return JSON.parse(text) as T
}

async function generateClaudeJSON<T>({
  model,
  apiKey,
  baseUrl,
  content,
}: {
  model: string
  apiKey: string
  baseUrl?: string
  content: Array<Record<string, unknown>>
}): Promise<T | null> {
  const endpoint = `${baseUrl?.trim() || 'https://api.anthropic.com'}/v1/messages`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      temperature: 0.2,
      messages: [{ role: 'user', content }],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Claude request failed with status ${response.status}`)
  }

  const payload = await response.json() as ClaudeGenerateResponse
  const text = payload.content?.find((item) => item.type === 'text')?.text
  if (!text) return null
  return JSON.parse(text) as T
}

async function generateOpenAIJSON<T>({
  model,
  apiKey,
  baseUrl,
  content,
}: {
  model: string
  apiKey: string
  baseUrl?: string
  content: Array<Record<string, unknown>>
}): Promise<T | null> {
  const endpoint = `${baseUrl?.trim() || 'https://api.openai.com'}/v1/chat/completions`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`ChatGPT request failed with status ${response.status}`)
  }

  const payload = await response.json() as OpenAIChatResponse
  const text = payload.choices?.[0]?.message?.content
  if (!text) return null
  return JSON.parse(text) as T
}

async function generateProviderJSON<T>({
  provider,
  mode,
  prompt,
  image,
}: {
  provider: StoredAIProvider
  mode: 'text' | 'image'
  prompt: string
  image?: { buffer: Buffer; mimeType: string }
}): Promise<T | null> {
  if (!provider.apiKey) return null

  if (provider.provider === 'gemini') {
    return generateGeminiJSON<T>({
      model: mode === 'image' ? provider.imageModel : provider.textModel,
      apiKey: provider.apiKey,
      parts: image
        ? [
            { text: prompt },
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.buffer.toString('base64'),
              },
            },
          ]
        : [{ text: prompt }],
    })
  }

  if (provider.provider === 'claude') {
    return generateClaudeJSON<T>({
      model: mode === 'image' ? provider.imageModel : provider.textModel,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      content: image
        ? [
            { type: 'text', text: prompt },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.mimeType,
                data: image.buffer.toString('base64'),
              },
            },
          ]
        : [{ type: 'text', text: prompt }],
    })
  }

  return generateOpenAIJSON<T>({
    model: mode === 'image' ? provider.imageModel : provider.textModel,
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    content: image
      ? [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${image.mimeType};base64,${image.buffer.toString('base64')}`,
            },
          },
        ]
      : [{ type: 'text', text: prompt }],
  })
}

async function getConfiguredProviders(mode: 'text' | 'image') {
  const settings = await getAISettings()
  const multiAgentEnabled = settings.AI_MULTI_AGENT_ENABLED !== 'false'
  const maxTerms = Math.max(4, Math.min(12, Number(settings.AI_MULTI_AGENT_MAX_TERMS || '8')))
  const configuredProviders = multiAgentEnabled ? (await getStoredAIProviders()).filter((item) => item.enabled && item.apiKey) : []

  return {
    providers: configuredProviders.filter((item) =>
      mode === 'image' ? AI_PROVIDER_CATALOG[item.provider].supportsImage : AI_PROVIDER_CATALOG[item.provider].supportsText
    ),
    maxTerms,
    usingLegacyGemini: false,
  }
}

async function executeAcrossProviders<T>({
  providers,
  mode,
  promptFactory,
  image,
}: {
  providers: StoredAIProvider[]
  mode: 'text' | 'image'
  promptFactory: (provider: StoredAIProvider) => string
  image?: { buffer: Buffer; mimeType: string }
}) {
  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      const result = await generateProviderJSON<T>({
        provider,
        mode,
        prompt: promptFactory(provider),
        image,
      })
      if (!result) {
        throw new Error(`${provider.label} returned an empty response`)
      }
      return {
        providerId: provider.id,
        provider: provider.provider,
        label: provider.label,
        result,
      } satisfies ProviderExecutionResult<T>
    })
  )

  const successes: ProviderExecutionResult<T>[] = []
  for (const item of settled) {
    if (item.status === 'fulfilled') {
      successes.push(item.value)
    }
  }
  return successes
}

export async function expandMarketplaceSearchQuery(query: string, scope: SearchScope) {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return {
      normalizedQuery: '',
      searchTerms: [] as string[],
      note: 'Empty query',
      usedAI: false,
      providersUsed: [] as string[],
    }
  }

  const { providers, maxTerms, usingLegacyGemini } = await getConfiguredProviders('text')
  if (providers.length === 0) {
    return {
      normalizedQuery: trimmedQuery,
      searchTerms: normalizeTerms([trimmedQuery], maxTerms),
      note: 'No active AI providers configured',
      usedAI: false,
      providersUsed: [] as string[],
    }
  }

  try {
    const results = await executeAcrossProviders<QueryExpansionResponse>({
      providers,
      mode: 'text',
      promptFactory: () =>
        `You improve search queries for a B2B marketplace. ` +
        `Return JSON with keys normalizedQuery, intent, searchTerms, note. ` +
        `searchTerms must contain 4 to ${maxTerms} short marketplace-friendly terms or phrases. ` +
        `Prefer product names, materials, industries, supplier types, and category hints. ` +
        `Scope is ${scope}. Query: ${trimmedQuery}`,
    })

    if (!results.length) throw new Error('No providers returned usable results')

    const first = results[0].result
    const terms = normalizeTerms(
      [
        trimmedQuery,
        ...results.flatMap((item) => [
          item.result.normalizedQuery || '',
          ...(item.result.searchTerms || []),
        ]),
      ],
      maxTerms
    )

    return {
      normalizedQuery: first.normalizedQuery?.trim() || trimmedQuery,
      searchTerms: terms.length ? terms : normalizeTerms([trimmedQuery], maxTerms),
      note: usingLegacyGemini
        ? first.note || 'Legacy Gemini query expansion applied'
        : `Multi-agent query expansion used ${results.map((item) => item.label).join(', ')}`,
      usedAI: true,
      providersUsed: results.map((item) => item.label),
    }
  } catch (error) {
    console.error('AI text search expansion failed:', error)
    return {
      normalizedQuery: trimmedQuery,
      searchTerms: normalizeTerms([trimmedQuery], maxTerms),
      note: 'AI expansion failed, using direct keyword search',
      usedAI: false,
      providersUsed: [] as string[],
    }
  }
}

export async function analyzeMarketplaceSearchImage(input: {
  buffer: Buffer
  mimeType: string
  fileName: string
  hint?: string
}) {
  const { providers, maxTerms, usingLegacyGemini } = await getConfiguredProviders('image')
  const fallbackTerms = normalizeTerms([input.fileName, input.hint || ''], maxTerms)

  if (providers.length === 0) {
    return {
      extractedTags: fallbackTerms,
      searchQuery: fallbackTerms.join(' '),
      note: 'No active AI providers configured',
      usedAI: false,
      providersUsed: [] as string[],
    }
  }

  try {
    const results = await executeAcrossProviders<ImageAnalysisResponse>({
      providers,
      mode: 'image',
      image: { buffer: input.buffer, mimeType: input.mimeType },
      promptFactory: () =>
        `You analyze product images for a global B2B marketplace. ` +
        `Return JSON with keys searchQuery, extractedTags, note. ` +
        `extractedTags must contain 4 to ${maxTerms} concise product-identifying keywords or short phrases. ` +
        `Focus on likely product type, material, usage, and industry category. ` +
        `Optional user hint: ${input.hint?.trim() || 'none'}.`,
    })

    if (!results.length) throw new Error('No providers returned usable image analysis')

    const first = results[0].result
    const extractedTags = normalizeTerms(
      [
        input.fileName,
        input.hint || '',
        ...results.flatMap((item) => [item.result.searchQuery || '', ...(item.result.extractedTags || [])]),
      ],
      maxTerms
    )

    return {
      extractedTags,
      searchQuery: first.searchQuery?.trim() || extractedTags.join(' '),
      note: usingLegacyGemini
        ? first.note || 'Legacy Gemini analyzed the image'
        : `Multi-agent image analysis used ${results.map((item) => item.label).join(', ')}`,
      usedAI: true,
      providersUsed: results.map((item) => item.label),
    }
  } catch (error) {
    console.error('AI image search analysis failed:', error)
    return {
      extractedTags: fallbackTerms,
      searchQuery: fallbackTerms.join(' '),
      note: 'AI image analysis failed, using fallback keyword extraction.',
      usedAI: false,
      providersUsed: [] as string[],
    }
  }
}
