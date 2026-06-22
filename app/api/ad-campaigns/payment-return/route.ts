import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, isAdmin, isSupplier, requireAuth } from '@/lib/permissions'
import { failAdCampaignPayment } from '@/lib/advertising/payment'
import { handleApiError, successResponse } from '@/lib/utils/api'

const schema = z.object({
  campaignId: z.string(),
  payment: z.enum(['success', 'failed', 'cancelled']),
  gateway: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (!isSupplier(authUser) && !isAdmin(authUser)) {
      throw new ApiError(403, 'Supplier access required')
    }

    const data = schema.parse(await req.json())
    if (data.payment === 'success') {
      return successResponse(null, 'Success callback noted')
    }

    const campaign = await prisma.adCampaign.findUnique({
      where: { id: data.campaignId },
      select: { id: true, companyId: true },
    })
    if (!campaign) throw new ApiError(404, 'Ad campaign not found')
    if (!isAdmin(authUser) && campaign.companyId !== authUser.companyId) {
      throw new ApiError(403, 'This ad campaign does not belong to your supplier account')
    }

    const payments = await prisma.payment.findMany({
      where: {
        metadata: {
          contains: `"adCampaignId":"${data.campaignId}"`,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, status: true, metadata: true },
    })

    const pending = payments.find((payment) => payment.status === 'PENDING')
    if (!pending) {
      return successResponse(null, 'No pending ad campaign payment found')
    }

    await failAdCampaignPayment(
      pending.id,
      data.payment === 'cancelled' ? 'Checkout cancelled before payment completion' : 'Checkout failed before payment completion',
      { gateway: data.gateway || 'unknown', source: 'payment_return' },
      data.payment === 'cancelled' ? 'CANCELLED' : 'FAILED'
    )

    return successResponse(null, 'Ad campaign payment return processed')
  } catch (error) {
    return handleApiError(error)
  }
}
