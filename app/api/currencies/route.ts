import { NextRequest } from 'next/server'
import { successResponse, handleApiError } from '@/lib/utils/api'
import { getCurrencySnapshot } from '@/lib/currency/server'

export async function GET(_req: NextRequest) {
  try {
    const snapshot = await getCurrencySnapshot()
    return successResponse(snapshot, 'Currencies fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
