import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { scoreFinancingRequest } from '@/lib/finance/scoring'
import { formatFinancingRequest, humanizeFinancingStatus } from '@/lib/finance/request'
import { createNotification } from '@/server/services/notification'
import { ensureServicePartnersSeeded } from '@/lib/partners/server'

const reviewSchema = z.object({
  requestId: z.string(),
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED']).optional(),
  partnerId: z.string().optional(),
  partnerName: z.string().trim().min(2).max(120).optional(),
  reviewNotes: z.string().trim().max(2000).optional(),
})

const allowedTransitions: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CLOSED'],
  APPROVED: ['DISBURSED', 'REJECTED', 'CLOSED'],
  REJECTED: ['UNDER_REVIEW', 'CLOSED'],
  DISBURSED: ['CLOSED'],
  CLOSED: [],
}

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
    return successResponse(requests.map(formatFinancingRequest), 'Admin financing requests fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureServicePartnersSeeded()
    const admin = await requireAdmin(req)
    const data = reviewSchema.parse(await req.json())
    const existing = await prisma.financingRequest.findUnique({
      where: { id: data.requestId },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        partner: { select: { id: true, code: true, name: true, type: true, isDefault: true } },
      },
    })
    if (!existing) throw new ApiError(404, 'Financing request not found')

    const selectedPartner = data.partnerId
      ? await prisma.servicePartner.findFirst({ where: { id: data.partnerId, type: 'FINANCING', isActive: true } })
      : null

    if (data.partnerId && !selectedPartner) {
      throw new ApiError(404, 'Financing partner not found')
    }

    if (data.status) {
      const allowed = allowedTransitions[existing.status] || []
      if (!allowed.includes(data.status)) {
        throw new ApiError(409, `Cannot move financing request from ${humanizeFinancingStatus(existing.status)} to ${humanizeFinancingStatus(data.status)}`)
      }
    }

    const updated = await prisma.financingRequest.update({
      where: { id: data.requestId },
      data: {
        status: data.status,
        partnerId: selectedPartner?.id,
        partnerName: selectedPartner?.name || data.partnerName,
        reviewNotes: data.reviewNotes === undefined ? undefined : (data.reviewNotes || null),
        reviewedBy: data.status || data.reviewNotes ? admin.userId : undefined,
        reviewedAt: data.status || data.reviewNotes ? new Date() : undefined,
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        partner: { select: { id: true, code: true, name: true, type: true, isDefault: true } },
      },
    })

    const rescored = await scoreFinancingRequest(updated.id)
    const finalRequest = rescored
      ? await prisma.financingRequest.findUniqueOrThrow({
          where: { id: updated.id },
          include: {
            company: { select: { id: true, name: true, slug: true } },
            requester: { select: { id: true, firstName: true, lastName: true, email: true } },
            partner: { select: { id: true, code: true, name: true, type: true, isDefault: true } },
          },
        })
      : updated

    if (data.status && finalRequest.requesterUserId) {
      try {
        await createNotification({
          userId: finalRequest.requesterUserId,
          type: 'FINANCING_UPDATE',
          title: 'Financing request updated',
          message: `${finalRequest.company.name} financing request is now ${humanizeFinancingStatus(finalRequest.status)}.`,
          data: { financingRequestId: finalRequest.id, status: finalRequest.status },
        })
      } catch (error) {
        console.error('Failed to create financing review notification:', error)
      }
    }

    return successResponse(formatFinancingRequest(finalRequest), 'Financing request updated')
  } catch (error) {
    return handleApiError(error)
  }
}
