import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { scoreFinancingRequest } from '@/lib/finance/scoring'
import { ensureServicePartnersSeeded } from '@/lib/partners/server'

const reviewSchema = z.object({
  requestId: z.string(),
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED']).optional(),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
  reviewNotes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await ensureServicePartnersSeeded()
    await requireAdmin(req)
    const requests = await prisma.financingRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        partner: { select: { id: true, code: true, name: true, type: true, isDefault: true } },
      },
    })
    return successResponse(requests, 'Admin financing requests fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureServicePartnersSeeded()
    const admin = await requireAdmin(req)
    const data = reviewSchema.parse(await req.json())
    const selectedPartner = data.partnerId
      ? await prisma.servicePartner.findFirst({ where: { id: data.partnerId, type: 'FINANCING', isActive: true } })
      : null
    const updated = await prisma.financingRequest.update({
      where: { id: data.requestId },
      data: {
        status: data.status,
        partnerId: selectedPartner?.id,
        partnerName: selectedPartner?.name || data.partnerName,
        reviewNotes: data.reviewNotes,
        reviewedBy: admin.userId,
        reviewedAt: new Date(),
      },
    })
    const rescored = await scoreFinancingRequest(updated.id)
    return successResponse(rescored || updated, 'Financing request updated')
  } catch (error) {
    return handleApiError(error)
  }
}
