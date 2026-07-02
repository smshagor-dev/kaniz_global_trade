import { NextRequest } from 'next/server'
import { z } from 'zod'
import { FraudEntityType, FraudReviewDecision } from '@prisma/client'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { applyAdminFraudDecision, getFraudCenterDashboard } from '@/lib/fraud/service'

const reviewSchema = z.object({
  entityType: z.nativeEnum(FraudEntityType),
  userId: z.string().optional(),
  companyId: z.string().optional(),
  alertId: z.string().optional(),
  historyId: z.string().optional(),
  decision: z.nativeEnum(FraudReviewDecision),
  note: z.string().optional(),
  requestedDocuments: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const payload = await getFraudCenterDashboard()
    return successResponse(payload, 'Fraud center dashboard fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const body = reviewSchema.parse(await req.json())
    const review = await applyAdminFraudDecision({
      adminUserId: admin.userId,
      entityType: body.entityType,
      userId: body.userId,
      companyId: body.companyId,
      alertId: body.alertId,
      historyId: body.historyId,
      decision: body.decision,
      note: body.note,
      requestedDocuments: body.requestedDocuments,
    })
    return successResponse(review, 'Fraud review saved')
  } catch (error) {
    return handleApiError(error)
  }
}
