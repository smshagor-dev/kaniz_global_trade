import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

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
    return successResponse(campaigns, 'Admin ad campaigns fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = reviewSchema.parse(await req.json())
    const updated = await prisma.adCampaign.update({
      where: { id: data.campaignId },
      data: {
        status: data.status,
        approvedBy: data.status === 'ACTIVE' ? admin.userId : undefined,
        approvedAt: data.status === 'ACTIVE' ? new Date() : undefined,
        rejectionReason: data.status === 'REJECTED' ? data.rejectionReason : null,
      },
    })
    return successResponse(updated, 'Ad campaign updated')
  } catch (error) {
    return handleApiError(error)
  }
}
