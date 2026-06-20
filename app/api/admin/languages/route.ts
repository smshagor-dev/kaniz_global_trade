import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { createLanguage, getLanguageAdminSnapshot } from '@/lib/i18n/server'

const createSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(2).max(100),
  nativeName: z.string().max(100).optional().or(z.literal('')),
  isRtl: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const snapshot = await getLanguageAdminSnapshot()
    return successResponse(snapshot, 'Languages fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const data = createSchema.parse(await req.json())
    const language = await createLanguage(data)
    return successResponse(language, 'Language saved')
  } catch (error) {
    return handleApiError(error)
  }
}
