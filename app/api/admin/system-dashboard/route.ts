import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { getSystemDashboardSnapshot } from '@/lib/monitoring/dashboard'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const snapshot = await getSystemDashboardSnapshot()
    return successResponse(snapshot, 'System dashboard fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
