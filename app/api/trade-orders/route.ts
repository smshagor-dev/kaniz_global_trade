import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { createTradeOrderFromQuotation } from '@/lib/trade/create-trade-order'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'
import { z } from 'zod'

const createTradeOrderSchema = z.object({
  quotationId: z.string(),
  shippingAddress: z.string().optional(),
  buyerNotes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
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
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
          supplierCompany: { select: { id: true, name: true, slug: true } },
          quotation: { select: { id: true, status: true, deliveryTime: true } },
          escrowAccount: true,
          shipments: { include: { events: { orderBy: { eventTime: 'desc' }, take: 5 } } },
          disputes: true,
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
    const authUser = await requireAuth(req)
    if (!authUser.roles.includes(ROLES.BUYER) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new ApiError(403, 'Buyer access required')
    }

    const data = createTradeOrderSchema.parse(await req.json())
    const order = await createTradeOrderFromQuotation({
      quotationId: data.quotationId,
      buyerId: authUser.userId,
      shippingAddress: data.shippingAddress,
      buyerNotes: data.buyerNotes,
    })

    return successResponse(order, 'Trade order created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
