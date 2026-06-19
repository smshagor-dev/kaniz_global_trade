import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { openInsuranceClaim, settleInsuranceClaim } from '@/lib/insurance/claims'

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
    return successResponse(claims, 'Admin insurance claims fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = reviewSchema.parse(await req.json())
    const updated = await prisma.insuranceClaim.update({
      where: { id: data.claimId },
      data: {
        status: data.status,
        resolutionNotes: data.resolutionNotes,
        reviewedBy: admin.userId,
        reviewedAt: new Date(),
        settledAt: data.status === 'SETTLED' ? new Date() : null,
      },
      include: { policy: true },
    })

    if (data.status === 'UNDER_REVIEW' || data.status === 'APPROVED') {
      await openInsuranceClaim(updated.policyId)
    }

    if (data.status === 'SETTLED') {
      await settleInsuranceClaim(updated.policyId)
    }

    return successResponse(updated, 'Insurance claim updated')
  } catch (error) {
    return handleApiError(error)
  }
}
