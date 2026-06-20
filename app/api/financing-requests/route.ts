import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { scoreFinancingRequest } from '@/lib/finance/scoring'
import { getDefaultPartner, ensureServicePartnersSeeded } from '@/lib/partners/server'

const createSchema = z.object({
  tradeOrderId: z.string().optional(),
  partnerId: z.string().optional(),
  amount: z.number().positive(),
  currencyCode: z.string().default('USD'),
  purpose: z.string().min(10),
  facilityType: z.string().default('WORKING_CAPITAL'),
  termDays: z.number().int().positive().optional(),
  partnerName: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await ensureServicePartnersSeeded()
    const authUser = await requireAuth(req)
    const where: Record<string, unknown> = {}
    if (authUser.companyId && !authUser.roles.includes(ROLES.ADMIN) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      where.companyId = authUser.companyId
    }
    const requests = await prisma.financingRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        partner: { select: { id: true, code: true, name: true, type: true, isDefault: true } },
      },
    })
    return successResponse(requests, 'Financing requests fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureServicePartnersSeeded()
    const authUser = await requireAuth(req)
    if (!authUser.companyId) throw new ApiError(403, 'Supplier company required')
    const data = createSchema.parse(await req.json())
    const selectedPartner = data.partnerId
      ? await prisma.servicePartner.findFirst({ where: { id: data.partnerId, type: 'FINANCING', isActive: true } })
      : await getDefaultPartner('FINANCING')

    const partnerId = 'id' in (selectedPartner || {}) ? selectedPartner?.id : null
    const partnerName = 'name' in (selectedPartner || {}) ? selectedPartner?.name : null

    const request = await prisma.financingRequest.create({
      data: {
        companyId: authUser.companyId,
        requesterUserId: authUser.userId,
        tradeOrderId: data.tradeOrderId,
        partnerId,
        amount: data.amount,
        currencyCode: data.currencyCode,
        purpose: data.purpose,
        facilityType: data.facilityType,
        termDays: data.termDays,
        partnerName: partnerName || data.partnerName,
      },
    })
    const scored = await scoreFinancingRequest(request.id)
    return successResponse(scored || request, 'Financing request submitted', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
