import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { getAdvertisingSettings } from '@/lib/advertising/settings'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const settings = await getAdvertisingSettings()
    return successResponse(settings, 'Advertising settings fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
