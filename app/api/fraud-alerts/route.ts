import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireAdmin, ApiError } from '@/lib/permissions'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'
import { refreshCompanyCreditProfile, refreshUserCreditProfile } from '@/lib/trust/credit-score'
import { FraudEventType } from '@prisma/client'
import { screenFraudEvent } from '@/lib/fraud/service'

const createSchema = z.object({
  targetUserId: z.string().optional(),
  targetCompanyId: z.string().optional(),
  tradeOrderId: z.string().optional(),
  sampleOrderId: z.string().optional(),
  reason: z.string().min(3),
  description: z.string().optional(),
  evidenceUrls: z.array(z.string().url()).default([]),
})

const reviewSchema = z.object({
  alertId: z.string(),
  status: z.enum(['OPEN', 'INVESTIGATING', 'WATCHLIST', 'RESOLVED', 'DISMISSED']),
  adminNotes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const [alerts, total] = await Promise.all([
      prisma.fraudAlert.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reportedBy: { select: { firstName: true, lastName: true, email: true } },
          targetCompany: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.fraudAlert.count(),
    ])
    return successResponse(alerts, 'Fraud alerts fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const data = createSchema.parse(await req.json())
    if (!data.targetUserId && !data.targetCompanyId) throw new ApiError(422, 'A target is required')

    const signalScore =
      (data.tradeOrderId ? 20 : 0) +
      (data.sampleOrderId ? 10 : 0) +
      Math.min(data.evidenceUrls.length * 15, 45) +
      (data.description ? Math.min(data.description.length / 10, 20) : 0)

    const alert = await prisma.fraudAlert.create({
      data: {
        reportedById: authUser.userId,
        targetUserId: data.targetUserId,
        targetCompanyId: data.targetCompanyId,
        tradeOrderId: data.tradeOrderId,
        sampleOrderId: data.sampleOrderId,
        reason: data.reason,
        description: data.description,
        evidenceUrls: JSON.stringify(data.evidenceUrls),
        signalScore: Math.round(signalScore),
      },
    })

    if (data.targetCompanyId) await refreshCompanyCreditProfile(data.targetCompanyId)
    if (data.targetUserId) await refreshUserCreditProfile(data.targetUserId)

    await screenFraudEvent({
      req,
      actorUserId: authUser.userId,
      userId: data.targetUserId || authUser.userId,
      companyId: data.targetCompanyId,
      eventType: FraudEventType.REPORT_ACTIVITY,
      sourceModule: 'fraud-alerts',
      title: 'Fraud report submitted',
      summary: data.reason,
      payload: {
        reason: data.reason,
        description: data.description,
        evidenceUrls: data.evidenceUrls,
        tradeOrderId: data.tradeOrderId,
        sampleOrderId: data.sampleOrderId,
      },
    })

    return successResponse(alert, 'Fraud alert submitted', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = reviewSchema.parse(await req.json())
    const updated = await prisma.fraudAlert.update({
      where: { id: data.alertId },
      data: {
        status: data.status,
        adminNotes: data.adminNotes,
        reviewedBy: admin.userId,
        reviewedAt: new Date(),
      },
    })
    if (updated.targetCompanyId) await refreshCompanyCreditProfile(updated.targetCompanyId)
    if (updated.targetUserId) await refreshUserCreditProfile(updated.targetUserId)
    return successResponse(updated, 'Fraud alert updated')
  } catch (error) {
    return handleApiError(error)
  }
}
