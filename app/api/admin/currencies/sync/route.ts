import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { getCurrencySnapshot } from '@/lib/currency/server'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const snapshot = await getCurrencySnapshot({ forceSync: true })
    return successResponse(snapshot, 'Currency rates synced successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
