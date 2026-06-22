import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, isAdmin, isSupplier, requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { scoreFinancingRequest } from '@/lib/finance/scoring'
import { formatFinancingRequest } from '@/lib/finance/request'
import { createNotification } from '@/server/services/notification'
import { getDefaultPartner, ensureServicePartnersSeeded } from '@/lib/partners/server'

const createSchema = z.object({
  tradeOrderId: z.string().optional(),
  partnerId: z.string().optional(),
  amount: z.number().positive(),
  currencyCode: z.string().trim().min(3).max(8).default('USD'),
  purpose: z.string().trim().min(10).max(2000),
  facilityType: z.string().trim().min(3).max(80).default('WORKING_CAPITAL'),
  termDays: z.number().int().positive().max(3650).optional(),
  partnerName: z.string().trim().min(2).max(120).optional(),
})

export async function GET(req: NextRequest) {
  try {
    await ensureServicePartnersSeeded()
    const authUser = await requireAuth(req)
    if (!isSupplier(authUser) && !isAdmin(authUser)) {
      throw new ApiError(403, 'Supplier access required')
    }

    const where: Record<string, unknown> = {}
    if (authUser.companyId && !isAdmin(authUser)) {
      where.companyId = authUser.companyId
    }

    const [requests, partners, defaultPartner, tradeOrders] = await Promise.all([
      prisma.financingRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true, slug: true } },
          requester: { select: { id: true, firstName: true, lastName: true, email: true } },
          partner: { select: { id: true, code: true, name: true, type: true, isDefault: true } },
        },
      }),
      prisma.servicePartner.findMany({
        where: { type: 'FINANCING', isActive: true },
        select: { id: true, name: true, code: true, description: true, isDefault: true },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      getDefaultPartner('FINANCING'),
      authUser.companyId
        ? prisma.tradeOrder.findMany({
            where: { supplierCompanyId: authUser.companyId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
              id: true,
              productName: true,
              totalAmount: true,
              currencyCode: true,
              status: true,
              buyer: { select: { firstName: true, lastName: true } },
            },
          })
        : Promise.resolve([]),
    ])

    return successResponse({
      items: requests.map(formatFinancingRequest),
      partners,
      defaultPartner,
      tradeOrders: tradeOrders.map((order) => ({
        ...order,
        totalAmount: Number(order.totalAmount),
        buyerName: `${order.buyer.firstName} ${order.buyer.lastName}`.trim(),
      })),
    }, 'Financing requests fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureServicePartnersSeeded()
    const authUser = await requireAuth(req)
    if (!isSupplier(authUser) && !isAdmin(authUser)) {
      throw new ApiError(403, 'Supplier access required')
    }
    if (!authUser.companyId) throw new ApiError(403, 'Supplier company required')

    const data = createSchema.parse(await req.json())
    let linkedTradeOrderId: string | null = null

    if (data.tradeOrderId) {
      const tradeOrder = await prisma.tradeOrder.findUnique({
        where: { id: data.tradeOrderId },
        select: { id: true, supplierCompanyId: true, totalAmount: true, currencyCode: true, status: true },
      })
      if (!tradeOrder) throw new ApiError(404, 'Trade order not found')
      if (!isAdmin(authUser) && tradeOrder.supplierCompanyId !== authUser.companyId) {
        throw new ApiError(403, 'This trade order does not belong to your supplier account')
      }
      linkedTradeOrderId = tradeOrder.id
    }

    const selectedPartner = data.partnerId
      ? await prisma.servicePartner.findFirst({ where: { id: data.partnerId, type: 'FINANCING', isActive: true } })
      : await getDefaultPartner('FINANCING')

    if (data.partnerId && !selectedPartner) {
      throw new ApiError(404, 'Financing partner not found')
    }

    const partnerId = 'id' in (selectedPartner || {}) ? selectedPartner?.id : null
    const partnerName = 'name' in (selectedPartner || {}) ? selectedPartner?.name : null

    const created = await prisma.financingRequest.create({
      data: {
        companyId: authUser.companyId,
        requesterUserId: authUser.userId,
        tradeOrderId: linkedTradeOrderId,
        partnerId,
        amount: data.amount,
        currencyCode: data.currencyCode.toUpperCase(),
        purpose: data.purpose,
        facilityType: data.facilityType.toUpperCase(),
        termDays: data.termDays,
        partnerName: partnerName || data.partnerName || null,
      },
    })

    const rescored = await scoreFinancingRequest(created.id)
    const requestRecord = await prisma.financingRequest.findUniqueOrThrow({
      where: { id: rescored?.id || created.id },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        partner: { select: { id: true, code: true, name: true, type: true, isDefault: true } },
      },
    })

    try {
      const admins = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: {
                name: { in: ['ADMIN', 'SUPER_ADMIN'] },
              },
            },
          },
        },
        select: { id: true },
        take: 5,
      })

      await Promise.all(admins.map((admin) => createNotification({
        userId: admin.id,
        type: 'FINANCING_UPDATE',
        title: 'New financing request submitted',
        message: `${requestRecord.company.name} requested ${requestRecord.currencyCode} ${Number(requestRecord.amount).toLocaleString()} in financing.`,
        data: { financingRequestId: requestRecord.id },
      })))
    } catch (error) {
      console.error('Failed to create financing submission notifications:', error)
    }

    return successResponse(formatFinancingRequest(requestRecord), 'Financing request submitted', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
