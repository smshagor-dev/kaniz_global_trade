import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'

const reviewSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['APPROVED', 'REJECTED', 'SUBMITTED']),
  adminNotes: z.string().optional().nullable(),
})

async function refreshCompanyVerificationStatus(companyId: string, adminUserId: string, rejectionReason?: string | null) {
  const requiredRequirements = await prisma.companyVerificationRequirement.findMany({
    where: { isActive: true, isRequired: true },
    select: { id: true },
  })

  const requiredIds = requiredRequirements.map((item) => item.id)
  const approvedCount = requiredIds.length
    ? await prisma.companyVerificationSubmission.count({
        where: {
          companyId,
          requirementId: { in: requiredIds },
          status: 'APPROVED',
        },
      })
    : 0

  const hasRejected = await prisma.companyVerificationSubmission.count({
    where: {
      companyId,
      status: 'REJECTED',
      requirement: { isActive: true },
    },
  })

  const nextStatus = hasRejected > 0
    ? 'REJECTED'
    : requiredIds.length > 0 && approvedCount === requiredIds.length
      ? 'DOCUMENT_VERIFIED'
      : 'DOCUMENT_SUBMITTED'

  await prisma.$transaction([
    prisma.company.update({
      where: { id: companyId },
      data: {
        verificationStatus: nextStatus,
        isVerified: nextStatus === 'DOCUMENT_VERIFIED',
      },
    }),
    prisma.companyVerification.upsert({
      where: { companyId },
      create: {
        companyId,
        status: nextStatus,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        rejectionReason: nextStatus === 'REJECTED' ? rejectionReason || null : null,
      },
      update: {
        status: nextStatus,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        rejectionReason: nextStatus === 'REJECTED' ? rejectionReason || null : null,
      },
    }),
  ])
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const status = searchParams.get('status') || undefined
    const companyId = searchParams.get('companyId') || undefined

    const where: Record<string, unknown> = {}
    if (status && status !== 'ALL') where.status = status
    if (companyId) where.companyId = companyId

    const [submissions, total] = await Promise.all([
      prisma.companyVerificationSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          company: { select: { id: true, name: true, slug: true, verificationStatus: true, isVerified: true } },
          requirement: true,
        },
      }),
      prisma.companyVerificationSubmission.count({ where }),
    ])

    return successResponse(submissions, 'Company verification submissions fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = reviewSchema.parse(await req.json())

    const existing = await prisma.companyVerificationSubmission.findUnique({
      where: { id: data.id },
      include: { requirement: true },
    })
    if (!existing) throw new ApiError(404, 'Submission not found')

    const reviewedAt = data.status === 'SUBMITTED' ? null : new Date()
    const reviewedBy = data.status === 'SUBMITTED' ? null : admin.userId

    const updated = await prisma.companyVerificationSubmission.update({
      where: { id: data.id },
      data: {
        status: data.status,
        adminNotes: data.adminNotes || null,
        reviewedAt,
        reviewedBy,
      },
      include: {
        company: { select: { id: true, name: true, slug: true, verificationStatus: true, isVerified: true } },
        requirement: true,
      },
    })

    await refreshCompanyVerificationStatus(
      updated.companyId,
      admin.userId,
      data.status === 'REJECTED' ? data.adminNotes || `${updated.requirement.title} rejected` : null
    )

    return successResponse(updated, 'Company verification submission reviewed')
  } catch (error) {
    return handleApiError(error)
  }
}
