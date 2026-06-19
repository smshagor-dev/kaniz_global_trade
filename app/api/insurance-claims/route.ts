import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { openInsuranceClaim } from '@/lib/insurance/claims'

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
    return successResponse(claims, 'Insurance claims fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const data = createSchema.parse(await req.json())
    const policy = await prisma.insurancePolicy.findUnique({ where: { id: data.policyId } })
    if (!policy) throw new ApiError(404, 'Policy not found')
    if (policy.buyerId !== authUser.userId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) throw new ApiError(403, 'Buyer access required')

    const claim = await prisma.insuranceClaim.create({
      data: {
        policyId: policy.id,
        companyId: policy.companyId,
        buyerId: policy.buyerId,
        title: data.title,
        description: data.description,
        claimAmount: data.claimAmount,
        currencyCode: data.currencyCode,
        evidenceUrls: JSON.stringify(data.evidenceUrls),
      },
    })

    await openInsuranceClaim(policy.id)

    return successResponse(claim, 'Insurance claim opened', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
