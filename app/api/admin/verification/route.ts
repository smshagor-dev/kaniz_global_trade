import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { createNotification } from '@/server/services/notification'
import { logApprove, logReject } from '@/lib/utils/audit'

const actionSchema = z.object({
  companyId: z.string(),
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_MORE']),
  status: z.enum(['EMAIL_VERIFIED', 'DOCUMENT_VERIFIED', 'PREMIUM_VERIFIED', 'ADMIN_VERIFIED', 'REJECTED']).optional(),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const status = searchParams.get('status') || 'DOCUMENT_SUBMITTED'

    const [verifications, total] = await Promise.all([
      prisma.companyVerification.findMany({
        where: { status: status as never },
        skip,
        take: limit,
        orderBy: { submittedAt: 'asc' },
        include: {
          company: {
            include: {
              country: { select: { name: true } },
              documents: true,
              certificates: true,
              companyUsers: {
                where: { isPrimary: true },
                include: { user: { select: { email: true, firstName: true, lastName: true } } },
              },
            },
          },
        },
      }),
      prisma.companyVerification.count({ where: { status: status as never } }),
    ])

    return successResponse(verifications, 'Verifications fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAdmin(req)
    const data = actionSchema.parse(await req.json())

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      include: {
        companyUsers: {
          where: { isPrimary: true },
          select: { userId: true },
        },
      },
    })
    if (!company) throw new ApiError(404, 'Company not found')

    const newStatus = data.action === 'APPROVE'
      ? (data.status || 'ADMIN_VERIFIED')
      : data.action === 'REJECT'
        ? 'REJECTED'
        : company.verificationStatus

    await prisma.$transaction([
      prisma.companyVerification.update({
        where: { companyId: data.companyId },
        data: {
          status: newStatus,
          reviewedAt: new Date(),
          reviewedBy: authUser.userId,
          rejectionReason: data.rejectionReason,
          notes: data.notes,
        },
      }),
      prisma.company.update({
        where: { id: data.companyId },
        data: {
          verificationStatus: newStatus,
          isVerified: data.action === 'APPROVE',
        },
      }),
    ])

    const ownerId = company.companyUsers[0]?.userId
    if (ownerId) {
      if (data.action === 'APPROVE') {
        await logApprove(authUser.userId, 'admin/verification', 'Company', data.companyId)
        await createNotification({
          userId: ownerId,
          type: 'COMPANY_VERIFIED',
          title: 'Company Verified',
          message: `Your company "${company.name}" has been verified as ${newStatus.replace('_', ' ')}.`,
          data: { companyId: data.companyId },
        })
      } else if (data.action === 'REJECT') {
        await logReject(authUser.userId, 'admin/verification', 'Company', data.companyId, data.rejectionReason)
        await createNotification({
          userId: ownerId,
          type: 'COMPANY_VERIFIED',
          title: 'Verification Update',
          message: `Verification for "${company.name}" was not approved. ${data.rejectionReason || ''}`,
          data: { companyId: data.companyId },
        })
      }
    }

    return successResponse(null, `Verification ${data.action.toLowerCase()}d`)
  } catch (error) {
    return handleApiError(error)
  }
}
