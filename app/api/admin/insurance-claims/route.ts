import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { createNotification } from '@/server/services/notification'
import { formatInsuranceClaim, humanizeClaimStatus } from '@/lib/insurance/claim'
import { openInsuranceClaim, settleInsuranceClaim, syncInsurancePolicyClaimState } from '@/lib/insurance/claims'

const reviewSchema = z.object({
  claimId: z.string(),
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED']),
  resolutionNotes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const claims = await prisma.insuranceClaim.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        policy: { select: { id: true, providerName: true, policyType: true, status: true } },
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    return successResponse(claims.map(formatInsuranceClaim), 'Admin insurance claims fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = reviewSchema.parse(await req.json())
    const updated = await prisma.$transaction(async (tx) => {
      const claim = await tx.insuranceClaim.update({
        where: { id: data.claimId },
        data: {
          status: data.status,
          resolutionNotes: data.resolutionNotes,
          reviewedBy: admin.userId,
          reviewedAt: new Date(),
          settledAt: data.status === 'SETTLED' ? new Date() : null,
        },
        select: { id: true, policyId: true },
      })

      if (data.status === 'UNDER_REVIEW' || data.status === 'APPROVED') {
        await openInsuranceClaim(claim.policyId, tx)
      } else if (data.status === 'SETTLED') {
        await settleInsuranceClaim(claim.policyId, tx)
      } else if (data.status === 'REJECTED') {
        await syncInsurancePolicyClaimState(claim.policyId, tx)
      }

      return tx.insuranceClaim.findUniqueOrThrow({
        where: { id: claim.id },
        include: {
          policy: { select: { id: true, providerName: true, policyType: true, status: true } },
          company: { select: { id: true, name: true, slug: true } },
          buyer: { select: { id: true, firstName: true, lastName: true } },
        },
      })
    })

    try {
      await createNotification({
        userId: updated.buyer.id,
        type: 'INSURANCE_UPDATE',
        title: 'Insurance claim updated',
        message: `${updated.title} is now ${humanizeClaimStatus(data.status)}.`,
        data: { insuranceClaimId: updated.id, insurancePolicyId: updated.policy.id, status: data.status },
      })
    } catch (error) {
      console.error('Failed to create insurance review notification:', error)
    }

    return successResponse(formatInsuranceClaim(updated), 'Insurance claim updated')
  } catch (error) {
    return handleApiError(error)
  }
}
