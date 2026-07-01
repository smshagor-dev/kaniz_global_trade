import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth } from '@/lib/permissions'
import { feeCalculationService } from '@/lib/finance/service-fees'
import { handleApiError, successResponse } from '@/lib/utils/api'

const createSchema = z.object({
  planCode: z.string().min(2),
  companyId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const items = await prisma.aiSubscription.findMany({
      where: { userId: authUser.userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(items, 'AI subscriptions fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const data = createSchema.parse(await req.json())

    const plan = await prisma.aiPlan.findUnique({ where: { code: data.planCode } })
    if (!plan || !plan.isActive) {
      throw new Error('AI plan not found or inactive')
    }

    const revenueLedger = await feeCalculationService.createRevenueLedger({
      sourceType: 'AI_SUBSCRIPTION',
      sourceId: plan.id,
      userId: authUser.userId,
      companyId: data.companyId ?? null,
      grossAmount: Number(plan.monthlyPrice),
      feeAmount: Number(plan.monthlyPrice),
      netAmount: Number(plan.monthlyPrice),
      currency: plan.currency,
      refundableAmount: Number(plan.monthlyPrice),
    })

    const now = new Date()
    const renewalDate = new Date(now)
    renewalDate.setMonth(renewalDate.getMonth() + 1)

    const subscription = await prisma.aiSubscription.create({
      data: {
        planId: plan.id,
        userId: authUser.userId,
        companyId: data.companyId ?? null,
        revenueLedgerId: revenueLedger.id,
        renewalDate,
        usageSnapshot: JSON.stringify({}),
      },
      include: { plan: true },
    })

    return successResponse(subscription, 'AI subscription created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
