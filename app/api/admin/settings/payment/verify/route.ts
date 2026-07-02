import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/permissions'
import { getPaymentReadinessReport } from '@/lib/payment/readiness'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function POST(_req: NextRequest) {
  try {
    await requireAdmin(_req)
    const report = await getPaymentReadinessReport()

    return successResponse(
      report,
      report.overallStatus === 'ok'
        ? 'Payment readiness verified'
        : report.overallStatus === 'warning'
          ? 'Payment readiness completed with warnings'
          : 'Payment readiness found blocking issues'
    )
  } catch (error) {
    return handleApiError(error)
  }
}
