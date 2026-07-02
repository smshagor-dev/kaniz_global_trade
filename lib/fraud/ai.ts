import { getStoredAIProviders, type StoredAIProvider } from '@/lib/ai/provider-registry'

type FraudAIResponse = {
  riskScore: number
  summary: string
  reasons: string[]
  recommendedAction: 'ALLOW' | 'REVIEW' | 'RESTRICT' | 'BLOCK'
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
          temperature: 0.1,
        },
      }),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini fraud analysis failed with status ${response.status}`)
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
      max_tokens: 700,
      temperature: 0.1,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Claude fraud analysis failed with status ${response.status}`)
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
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`ChatGPT fraud analysis failed with status ${response.status}`)
  }

  const payload = await response.json() as OpenAIChatResponse
  const text = payload.choices?.[0]?.message?.content
  return text ? JSON.parse(text) as T : null
}

async function analyzeWithProvider(provider: StoredAIProvider, prompt: string) {
  if (provider.provider === 'gemini') return generateGeminiJSON<FraudAIResponse>(provider, prompt)
  if (provider.provider === 'claude') return generateClaudeJSON<FraudAIResponse>(provider, prompt)
  return generateOpenAIJSON<FraudAIResponse>(provider, prompt)
}

export async function runFraudAIAnalysis(input: {
  title: string
  eventType: string
  sourceModule: string
  entityLabel: string
  payload: Record<string, unknown>
  ruleSignals: string[]
}) {
  const providers = (await getStoredAIProviders()).filter((item) => item.enabled && item.apiKey)
  const provider = providers[0]
  if (!provider) return null

  const prompt = [
    'You are a marketplace fraud analyst for a B2B supplier and buyer platform.',
    'Return strict JSON with keys: riskScore, summary, reasons, recommendedAction.',
    'riskScore must be 0-100.',
    'recommendedAction must be one of ALLOW, REVIEW, RESTRICT, BLOCK.',
    `Event: ${input.eventType}`,
    `Source module: ${input.sourceModule}`,
    `Entity: ${input.entityLabel}`,
    `Title: ${input.title}`,
    `Rule signals: ${input.ruleSignals.join('; ') || 'none'}`,
    `Payload: ${JSON.stringify(input.payload)}`,
  ].join('\n')

  try {
    const result = await analyzeWithProvider(provider, prompt)
    if (!result) return null
    return {
      provider,
      result: {
        riskScore: Math.max(0, Math.min(100, Number(result.riskScore || 0))),
        summary: typeof result.summary === 'string' ? result.summary : 'AI analysis completed.',
        reasons: Array.isArray(result.reasons) ? result.reasons.filter((item): item is string => typeof item === 'string') : [],
        recommendedAction: result.recommendedAction || 'REVIEW',
      },
    }
  } catch (error) {
    console.error('Fraud AI analysis failed:', error)
    return null
  }
}
