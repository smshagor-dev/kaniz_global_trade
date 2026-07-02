import { randomUUID } from 'crypto'
import { getSettingValue, updateSettings } from '@/lib/settings/system'

export type AIProviderKind = 'gemini' | 'claude' | 'chatgpt'

export interface StoredAIProvider {
  id: string
  provider: AIProviderKind
  label: string
  apiKey: string
  textModel: string
  imageModel: string
  baseUrl?: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface AIProviderSnapshot extends Omit<StoredAIProvider, 'apiKey'> {
  hasApiKey: boolean
}

export const AI_PROVIDER_CATALOG: Record<
  AIProviderKind,
  {
    label: string
    textModel: string
    imageModel: string
    supportsImage: boolean
    supportsText: boolean
  }
> = {
  gemini: {
    label: 'Gemini',
    textModel: 'gemini-2.0-flash',
    imageModel: 'gemini-2.0-flash',
    supportsImage: true,
    supportsText: true,
  },
  claude: {
    label: 'Claude',
    textModel: 'claude-3-5-sonnet-latest',
    imageModel: 'claude-3-5-sonnet-latest',
    supportsImage: true,
    supportsText: true,
  },
  chatgpt: {
    label: 'ChatGPT',
    textModel: 'gpt-4o-mini',
    imageModel: 'gpt-4o-mini',
    supportsImage: true,
    supportsText: true,
  },
}

const PROVIDERS_SETTING_KEY = 'AI_MULTI_AGENT_PROVIDERS'

function sanitizeStoredProvider(input: Partial<StoredAIProvider>): StoredAIProvider | null {
  if (!input.provider || !(input.provider in AI_PROVIDER_CATALOG)) return null

  const provider = input.provider as AIProviderKind
  const defaults = AI_PROVIDER_CATALOG[provider]
  const now = new Date().toISOString()

  return {
    id: typeof input.id === 'string' && input.id.trim() ? input.id : randomUUID(),
    provider,
    label: typeof input.label === 'string' && input.label.trim() ? input.label.trim() : defaults.label,
    apiKey: typeof input.apiKey === 'string' ? input.apiKey.trim() : '',
    textModel: typeof input.textModel === 'string' && input.textModel.trim() ? input.textModel.trim() : defaults.textModel,
    imageModel: typeof input.imageModel === 'string' && input.imageModel.trim() ? input.imageModel.trim() : defaults.imageModel,
    baseUrl: typeof input.baseUrl === 'string' && input.baseUrl.trim() ? input.baseUrl.trim() : '',
    enabled: input.enabled !== false,
    createdAt: typeof input.createdAt === 'string' && input.createdAt ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === 'string' && input.updatedAt ? input.updatedAt : now,
  }
}

export async function getStoredAIProviders(): Promise<StoredAIProvider[]> {
  const rawValue = await getSettingValue(PROVIDERS_SETTING_KEY)
  if (!rawValue) return []

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredAIProvider>[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => sanitizeStoredProvider(item))
      .filter((item): item is StoredAIProvider => Boolean(item))
  } catch {
    return []
  }
}

export async function saveStoredAIProviders(providers: StoredAIProvider[], updatedBy?: string) {
  return updateSettings('AI', [
    {
      key: PROVIDERS_SETTING_KEY,
      value: JSON.stringify(providers),
      updatedBy,
    },
  ])
}

export async function upsertStoredAIProvider(
  input: Omit<StoredAIProvider, 'createdAt' | 'updatedAt' | 'id'> & { id?: string; createdAt?: string },
  updatedBy?: string
) {
  const providers = await getStoredAIProviders()
  const existing = providers.find((item) => item.id === input.id)
  const now = new Date().toISOString()
  const nextProvider = sanitizeStoredProvider({
    ...input,
    apiKey: typeof input.apiKey === 'string' && input.apiKey.trim() ? input.apiKey : existing?.apiKey || '',
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now,
  })

  if (!nextProvider) {
    throw new Error('Invalid AI provider')
  }

  const nextProviders = existing
    ? providers.map((item) => (item.id === nextProvider.id ? nextProvider : item))
    : [...providers, nextProvider]

  await saveStoredAIProviders(nextProviders, updatedBy)
  return nextProvider
}

export async function deleteStoredAIProvider(id: string, updatedBy?: string) {
  const providers = await getStoredAIProviders()
  const nextProviders = providers.filter((item) => item.id !== id)
  await saveStoredAIProviders(nextProviders, updatedBy)
}

export function toAIProviderSnapshot(provider: StoredAIProvider): AIProviderSnapshot {
  return {
    id: provider.id,
    provider: provider.provider,
    label: provider.label,
    textModel: provider.textModel,
    imageModel: provider.imageModel,
    baseUrl: provider.baseUrl || '',
    enabled: provider.enabled,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
    hasApiKey: Boolean(provider.apiKey),
  }
}
