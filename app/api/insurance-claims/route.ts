import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError, assertComplianceAccess } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { openInsuranceClaim } from '@/lib/insurance/claims'
import { createNotification } from '@/server/services/notification'
import { formatInsuranceClaim } from '@/lib/insurance/claim'

const createSchema = z.object({
  policyId: z.string(),
  title: z.string().min(3),
  description: z.string().min(10),
  claimAmount: z.number().positive(),
  currencyCode: z.string().default('USD'),
  evidenceUrls: z.array(z.string().url()).default([]),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const where: Record<string, unknown> = {}
    if (authUser.roles.includes(ROLES.BUYER)) where.buyerId = authUser.userId
    else if (authUser.companyId && !authUser.roles.includes(ROLES.ADMIN) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) where.companyId = authUser.companyId

    const claims = await prisma.insuranceClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        policy: { select: { id: true, providerName: true, policyType: true, status: true } },
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    return successResponse(claims.map(formatInsuranceClaim), 'Insurance claims fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const data = createSchema.parse(await req.json())
    const policy = await prisma.insurancePolicy.findUnique({
      where: { id: data.policyId },
      include: {
        tradeOrder: { select: { productName: true } },
        sampleOrder: { select: { title: true } },
        company: { include: { companyUsers: { where: { isPrimary: true }, select: { userId: true } } } },
      },
    })
    if (!policy) throw new ApiError(404, 'Policy not found')
    if (!policy.buyerId) throw new ApiError(409, 'This insurance policy is not yet attached to a buyer')
    const buyerId = policy.buyerId
    if (policy.buyerId !== authUser.userId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) throw new ApiError(403, 'Buyer access required')
    if (!authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      await assertComplianceAccess({
        userId: authUser.userId,
        audience: 'BUYER',
      })
    }
    if (!['ACTIVE', 'CLAIM_OPEN'].includes(policy.status)) {
      throw new ApiError(409, 'Claims can only be opened for active insurance policies')
    }

    const claim = await prisma.$transaction(async (tx) => {
      const created = await tx.insuranceClaim.create({
        data: {
          policyId: policy.id,
          companyId: policy.companyId,
          buyerId,
          title: data.title,
          description: data.description,
          claimAmount: data.claimAmount,
          currencyCode: data.currencyCode,
          evidenceUrls: JSON.stringify(data.evidenceUrls),
        },
      })

      await openInsuranceClaim(policy.id, tx)

      return tx.insuranceClaim.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          policy: { select: { id: true, providerName: true, policyType: true, status: true } },
          company: { select: { id: true, name: true, slug: true } },
          buyer: { select: { id: true, firstName: true, lastName: true } },
        },
      })
    })

    const supplierOwnerId = policy.company.companyUsers[0]?.userId
    if (supplierOwnerId) {
      try {
        await createNotification({
          userId: supplierOwnerId,
          type: 'INSURANCE_UPDATE',
          title: 'New insurance claim opened',
          message: `A buyer opened an insurance claim for ${policy.tradeOrder?.productName || policy.sampleOrder?.title || policy.providerName}.`,
          data: { insuranceClaimId: claim.id, insurancePolicyId: policy.id },
        })
      } catch (error) {
        console.error('Failed to create insurance claim notification:', error)
      }
    }

    return successResponse(formatInsuranceClaim(claim), 'Insurance claim opened', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
