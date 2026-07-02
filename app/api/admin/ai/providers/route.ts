import { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { requireAdmin } from '@/lib/permissions'
import {
  deleteStoredAIProvider,
  getStoredAIProviders,
  toAIProviderSnapshot,
  upsertStoredAIProvider,
} from '@/lib/ai/provider-registry'

const providerSchema = z.object({
  id: z.string().optional(),
  provider: z.enum(['gemini', 'claude', 'chatgpt']),
  label: z.string().min(1),
  apiKey: z.string().optional().default(''),
  textModel: z.string().min(1),
  imageModel: z.string().min(1),
  baseUrl: z.string().optional().default(''),
  enabled: z.boolean().default(true),
})

const deleteSchema = z.object({
  id: z.string().min(1),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const providers = await getStoredAIProviders()
    return successResponse(providers.map(toAIProviderSnapshot), 'AI providers fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = providerSchema.parse(await req.json())
    const provider = await upsertStoredAIProvider(data, admin.userId)
    return successResponse(toAIProviderSnapshot(provider), data.id ? 'AI provider updated' : 'AI provider created')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const { id } = deleteSchema.parse(await req.json())
    await deleteStoredAIProvider(id, admin.userId)
    return successResponse({ id }, 'AI provider removed')
  } catch (error) {
    return handleApiError(error)
  }
}
