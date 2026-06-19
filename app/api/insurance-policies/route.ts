import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const createSchema = z.object({
  tradeOrderId: z.string().optional(),
  sampleOrderId: z.string().optional(),
  providerName: z.string().min(2),
  policyType: z.string().default('CARGO_INSURANCE'),
  insuredAmount: z.number().positive(),
  premiumAmount: z.number().nonnegative(),
  currencyCode: z.string().default('USD'),
  coverageSummary: z.string().optional(),
  claimInstructions: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const where: Record<string, unknown> = {}
    if (authUser.roles.includes(ROLES.BUYER)) where.buyerId = authUser.userId
    else if (authUser.companyId && !authUser.roles.includes(ROLES.ADMIN) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) where.companyId = authUser.companyId

    const policies = await prisma.insurancePolicy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        tradeOrder: { select: { id: true, productName: true } },
        sampleOrder: { select: { id: true, title: true } },
        claims: { orderBy: { createdAt: 'desc' } },
      },
    })
    return successResponse(policies, 'Insurance policies fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const data = createSchema.parse(await req.json())
    let buyerId = authUser.userId
    let companyId = authUser.companyId

    if (data.tradeOrderId) {
      const order = await prisma.tradeOrder.findUnique({ where: { id: data.tradeOrderId } })
      if (!order) throw new ApiError(404, 'Trade order not found')
      buyerId = order.buyerId
      companyId = order.supplierCompanyId
    }

    if (data.sampleOrderId) {
      const order = await prisma.sampleOrder.findUnique({ where: { id: data.sampleOrderId } })
      if (!order) throw new ApiError(404, 'Sample order not found')
      buyerId = order.buyerId
      companyId = order.supplierCompanyId
    }

    if (!companyId) throw new ApiError(422, 'Company required')

    const policy = await prisma.insurancePolicy.create({
      data: {
        companyId,
        buyerId,
        tradeOrderId: data.tradeOrderId,
        sampleOrderId: data.sampleOrderId,
        providerName: data.providerName,
        policyType: data.policyType,
        insuredAmount: data.insuredAmount,
        premiumAmount: data.premiumAmount,
        currencyCode: data.currencyCode,
        coverageSummary: data.coverageSummary,
        claimInstructions: data.claimInstructions,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        policyNumber: `POL-${Date.now()}`,
      },
    })
    return successResponse(policy, 'Insurance quote created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
