import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError, isAdmin, requireRole, requireVerifiedBuyer } from '@/lib/permissions'
import { createTradeOrderFromQuotation } from '@/lib/trade/create-trade-order'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'
import { z } from 'zod'
import { FraudEventType } from '@prisma/client'
import { assertFraudActionAllowed, screenFraudEvent } from '@/lib/fraud/service'
import { FRAUD_ACTIONS } from '@/lib/fraud/shared'

const createTradeOrderSchema = z.object({
  quotationId: z.string(),
  shippingAddress: z.string().optional(),
  buyerNotes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (
      !isAdmin(authUser) &&
      !authUser.roles.includes(ROLES.BUYER) &&
      !authUser.roles.includes(ROLES.SUPPLIER_OWNER) &&
      !authUser.roles.includes(ROLES.SUPPLIER_STAFF)
    ) {
      throw new ApiError(403, 'Marketplace trade order access required')
    }
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const status = searchParams.get('status') || undefined
    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (authUser.roles.includes(ROLES.BUYER)) {
      where.buyerId = authUser.userId
    } else if (authUser.companyId && !authUser.roles.includes(ROLES.ADMIN) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      where.supplierCompanyId = authUser.companyId
    }

    const [orders, total] = await Promise.all([
      prisma.tradeOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
          supplierCompany: { select: { id: true, name: true, slug: true } },
          quotation: { select: { id: true, status: true, deliveryTime: true } },
          escrowAccount: true,
          shipments: { include: { events: { orderBy: { eventTime: 'desc' }, take: 5 } } },
          disputes: true,
          ratings: {
            select: { id: true, authorUserId: true, rating: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.tradeOrder.count({ where }),
    ])

    return successResponse(orders, 'Trade orders fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const baseUser = await requireRole(req, ROLES.BUYER, ROLES.ADMIN, ROLES.SUPER_ADMIN)
    const data = createTradeOrderSchema.parse(await req.json())
    const quotation = await prisma.rFQQuotation.findUnique({
      where: { id: data.quotationId },
      select: { companyId: true, totalPrice: true, currencyCode: true },
    })
    if (!quotation) throw new ApiError(404, 'Quotation not found')

    await assertFraudActionAllowed({
      userId: baseUser.userId,
      companyId: quotation.companyId,
      action: FRAUD_ACTIONS.ORDER_CREATE,
    })
    const authUser = isAdmin(baseUser) ? baseUser : await requireVerifiedBuyer(baseUser)

    const order = await createTradeOrderFromQuotation({
      quotationId: data.quotationId,
      buyerId: authUser.userId,
      shippingAddress: data.shippingAddress,
      buyerNotes: data.buyerNotes,
    })

    await screenFraudEvent({
      req,
      actorUserId: authUser.userId,
      userId: authUser.userId,
      companyId: quotation.companyId,
      eventType: FraudEventType.ORDER_CREATE,
      sourceModule: 'trade-orders',
      title: 'Trade order created',
      summary: 'Buyer converted a quotation into a trade order.',
      payload: {
        quotationId: data.quotationId,
        totalPrice: quotation.totalPrice?.toString(),
        currencyCode: quotation.currencyCode,
        shippingAddress: data.shippingAddress,
      },
    })

    return successResponse(order, 'Trade order created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
