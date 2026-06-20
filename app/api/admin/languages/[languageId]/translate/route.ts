import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { getLanguageAdminSnapshot, translateLanguagePack } from '@/lib/i18n/server'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ languageId: string }> }
) {
  try {
    await requireAdmin(req)
    const { languageId } = await context.params
    await translateLanguagePack(languageId)
    const snapshot = await getLanguageAdminSnapshot()
    return successResponse(snapshot, 'Language translated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
