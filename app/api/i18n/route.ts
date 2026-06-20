import { NextRequest } from 'next/server'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { getTranslationsForLanguage } from '@/lib/i18n/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const language = searchParams.get('language') || 'en'
    const snapshot = await getTranslationsForLanguage(language)
    return successResponse(snapshot, 'Translations fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
