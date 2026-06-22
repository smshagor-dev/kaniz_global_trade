import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { getCampaignPaymentSummary } from '@/lib/advertising/payment'

const reviewSchema = z.object({
  campaignId: z.string(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED']),
  rejectionReason: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const campaigns = await prisma.adCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    })
    const paymentSummary = await getCampaignPaymentSummary(campaigns.map((campaign) => campaign.id))
    return successResponse(campaigns.map((campaign) => ({
      ...campaign,
      budget: Number(campaign.budget || 0),
      bidAmount: Number(campaign.bidAmount || 0),
      spent: Number(campaign.spent || 0),
      paymentStatus: paymentSummary.get(campaign.id)?.status || null,
      paymentMethod: paymentSummary.get(campaign.id)?.method || null,
      paymentFailureReason: paymentSummary.get(campaign.id)?.failureReason || null,
    })), 'Admin ad campaigns fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = reviewSchema.parse(await req.json())
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: data.campaignId },
      select: { id: true, status: true },
    })
    if (!campaign) {
      throw new ApiError(404, 'Ad campaign not found')
    }
    if (campaign.status === 'DRAFT' && data.status === 'ACTIVE') {
      throw new ApiError(409, 'Campaign payment must be completed before approval')
    }

    const updated = await prisma.adCampaign.update({
      where: { id: data.campaignId },
      data: {
        status: data.status,
        approvedBy: data.status === 'ACTIVE' ? admin.userId : undefined,
        approvedAt: data.status === 'ACTIVE' ? new Date() : undefined,
        rejectionReason: data.status === 'REJECTED' ? data.rejectionReason || 'Rejected by Kaniz Global Trade review' : null,
      },
    })
    return successResponse(updated, 'Ad campaign updated')
  } catch (error) {
    return handleApiError(error)
  }
}
