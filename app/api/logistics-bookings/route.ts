import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { listAvailableLogisticsProviders } from '@/lib/shipping/providers'

const createSchema = z.object({
  tradeOrderId: z.string().optional(),
  sampleOrderId: z.string().optional(),
  providerName: z.string().min(2),
  serviceMode: z.string().default('AIR_FREIGHT'),
  origin: z.string().min(2),
  destination: z.string().min(2),
  quotedCost: z.number().nonnegative(),
  currencyCode: z.string().default('USD'),
  estimatedDeliveryAt: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const where: Record<string, unknown> = {}
    if (authUser.roles.includes(ROLES.BUYER)) where.buyerId = authUser.userId
    else if (authUser.companyId && !authUser.roles.includes(ROLES.ADMIN) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) where.companyId = authUser.companyId

    const [bookings, providers] = await Promise.all([
      prisma.logisticsBooking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true, slug: true } },
          buyer: { select: { id: true, firstName: true, lastName: true } },
          tradeOrder: { select: { id: true, productName: true } },
          sampleOrder: { select: { id: true, title: true } },
        },
      }),
      listAvailableLogisticsProviders(),
    ])
    return successResponse({ items: bookings, providers }, 'Logistics bookings fetched')
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

    const providers = await listAvailableLogisticsProviders()
    const booking = await prisma.logisticsBooking.create({
      data: {
        companyId,
        buyerId,
        tradeOrderId: data.tradeOrderId,
        sampleOrderId: data.sampleOrderId,
        providerName: data.providerName,
        serviceMode: data.serviceMode,
        origin: data.origin,
        destination: data.destination,
        quotedCost: data.quotedCost,
        currencyCode: data.currencyCode,
        estimatedDeliveryAt: data.estimatedDeliveryAt ? new Date(data.estimatedDeliveryAt) : null,
        notes: data.notes,
        bookingReference: `LGT-${Date.now()}`,
        metadata: JSON.stringify({
          hasTrackingCredentials: providers.find((item) => item.name === data.providerName.toUpperCase())?.hasCredentials ?? false,
        }),
      },
    })

    return successResponse(booking, 'Logistics quote created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
