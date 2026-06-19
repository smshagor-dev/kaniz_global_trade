import { NextRequest } from 'next/server'
import { BuyerVerificationStatus } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { createNotification } from '@/server/services/notification'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'

const reviewSchema = z.object({
  verificationId: z.string(),
  status: z.enum(['UNDER_REVIEW', 'VERIFIED', 'REJECTED']),
  rejectionReason: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const status = (searchParams.get('status') as BuyerVerificationStatus | null) || undefined

    const where = status ? { status } : {}
    const [records, total] = await Promise.all([
      prisma.buyerVerification.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.buyerVerification.count({ where }),
    ])

    return successResponse(records, 'Buyer verification queue fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = reviewSchema.parse(await req.json())

    const updated = await prisma.buyerVerification.update({
      where: { id: data.verificationId },
      data: {
        status: data.status,
        reviewedAt: new Date(),
        reviewedBy: admin.userId,
        rejectionReason: data.status === 'REJECTED' ? data.rejectionReason : null,
      },
      include: {
        user: { select: { id: true } },
      },
    })

    await createNotification({
      userId: updated.user.id,
      type: data.status === 'VERIFIED' ? 'BUYER_VERIFIED' : 'ADMIN_ANNOUNCEMENT',
      title: data.status === 'VERIFIED' ? 'Buyer Verification Approved' : 'Buyer Verification Updated',
      message:
        data.status === 'VERIFIED'
          ? 'Your buyer account is now verified.'
          : data.status === 'REJECTED'
            ? `Buyer verification rejected. ${data.rejectionReason || ''}`
            : 'Your buyer verification is under review.',
      data: { verificationId: updated.id, status: updated.status },
    })

    return successResponse(updated, 'Buyer verification updated')
  } catch (error) {
    return handleApiError(error)
  }
}
