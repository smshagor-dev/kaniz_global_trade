import { NextRequest } from 'next/server'
import { KYCStatus } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { refreshUserCreditProfile } from '@/lib/trust/credit-score'

const reviewSchema = z.object({
  kycId: z.string(),
  status: z.enum(['UNDER_REVIEW', 'VERIFIED', 'REJECTED']),
  riskLevel: z.string().optional(),
  transactionLimit: z.number().positive().optional(),
  rejectionReason: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const status = (searchParams.get('status') as KYCStatus | null) || undefined
    const where = status ? { status } : {}

    const [records, total] = await Promise.all([
      prisma.kYCProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          company: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.kYCProfile.count({ where }),
    ])

    return successResponse(records, 'KYC queue fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = reviewSchema.parse(await req.json())
    const updated = await prisma.kYCProfile.update({
      where: { id: data.kycId },
      data: {
        status: data.status,
        riskLevel: data.riskLevel,
        transactionLimit: data.transactionLimit,
        rejectionReason: data.status === 'REJECTED' ? data.rejectionReason : null,
        reviewedBy: admin.userId,
        reviewedAt: new Date(),
      },
    })
    await refreshUserCreditProfile(updated.userId)
    return successResponse(updated, 'KYC updated')
  } catch (error) {
    return handleApiError(error)
  }
}
