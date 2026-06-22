import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { buildTrackingUrl } from '@/lib/shipping/tracking'
import { listAvailableLogisticsProviders } from '@/lib/shipping/providers'
import { createNotification } from '@/server/services/notification'
import { handleApiError, successResponse } from '@/lib/utils/api'

const updateSampleOrderSchema = z.object({
  action: z.enum(['CONFIRM', 'REJECT', 'SHIP', 'MARK_DELIVERED', 'CANCEL']),
  supplierNotes: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingCarrier: z.string().optional(),
  awbNumber: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const order = await prisma.sampleOrder.findUnique({
      where: { id },
      include: {
        product: true,
        buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
        supplierCompany: true,
        payments: true,
        shipments: { include: { events: { orderBy: { eventTime: 'desc' } } } },
      },
    })

    if (!order) throw new ApiError(404, 'Sample order not found')
    if (
      order.buyerId !== authUser.userId &&
      order.supplierCompanyId !== authUser.companyId &&
      !authUser.roles.includes(ROLES.SUPER_ADMIN)
    ) {
      throw new ApiError(403, 'Access denied')
    }

    return successResponse(order, 'Sample order fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const data = updateSampleOrderSchema.parse(await req.json())

    const order = await prisma.sampleOrder.findUnique({ where: { id } })
    if (!order) throw new ApiError(404, 'Sample order not found')
    const supplierCompany = await prisma.company.findUnique({
      where: { id: order.supplierCompanyId },
      include: { companyUsers: { where: { isPrimary: true }, select: { userId: true } } },
    })
    const supplierOwnerId = supplierCompany?.companyUsers[0]?.userId || null

    const supplierAction = ['CONFIRM', 'REJECT', 'SHIP'].includes(data.action)
    if (supplierAction) {
      if (order.supplierCompanyId !== authUser.companyId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
        throw new ApiError(403, 'Supplier access required')
      }
    } else if (order.buyerId !== authUser.userId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new ApiError(403, 'Buyer access required')
    }

    let updated = order

    if (data.action === 'CONFIRM') {
      if (order.status !== 'PENDING_SUPPLIER_CONFIRMATION') {
        throw new ApiError(409, 'Only paid sample orders awaiting supplier confirmation can be confirmed')
      }
      updated = await prisma.sampleOrder.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          supplierNotes: data.supplierNotes,
        },
      })
    } else if (data.action === 'REJECT') {
      if (!['PENDING_SUPPLIER_CONFIRMATION', 'CONFIRMED'].includes(order.status)) {
        throw new ApiError(409, 'This sample order cannot be rejected in its current state')
      }
      updated = await prisma.sampleOrder.update({
        where: { id: order.id },
        data: {
          status: 'REJECTED',
          supplierNotes: data.supplierNotes,
        },
      })
    } else if (data.action === 'SHIP') {
      if (order.status !== 'CONFIRMED') {
        throw new ApiError(409, 'Only confirmed sample orders can be shipped')
      }
      if (!data.trackingNumber || !data.trackingCarrier) {
        throw new ApiError(422, 'Tracking number and carrier are required')
      }
      const trackingCarrier = data.trackingCarrier
      const trackingNumber = data.trackingNumber
      const activeProviders = await listAvailableLogisticsProviders()
      const normalizedCarrier = trackingCarrier.trim().toUpperCase()
      if (!activeProviders.some((provider) => provider.name === normalizedCarrier)) {
        throw new ApiError(422, 'Selected carrier is not active in Kaniz Global Trade shipping settings')
      }

      updated = await prisma.$transaction(async (tx) => {
        const saved = await tx.sampleOrder.update({
          where: { id: order.id },
          data: {
            status: 'SHIPPED',
            shippedAt: new Date(),
            supplierNotes: data.supplierNotes,
          },
        })

        const shipment = await tx.shipment.create({
          data: {
            sampleOrderId: order.id,
            buyerId: order.buyerId,
            supplierCompanyId: order.supplierCompanyId,
            carrier: normalizedCarrier,
            trackingNumber,
            awbNumber: data.awbNumber,
            trackingUrl: (await buildTrackingUrl(normalizedCarrier, trackingNumber)) || null,
            status: 'IN_TRANSIT',
            shippedAt: new Date(),
            lastEvent: 'Sample shipment created',
          },
        })

        await tx.shipmentEvent.create({
          data: {
            shipmentId: shipment.id,
            status: 'IN_TRANSIT',
            description: 'Sample shipment created',
            eventTime: new Date(),
          },
        })

        return saved
      })
    } else if (data.action === 'MARK_DELIVERED') {
      if (order.status !== 'SHIPPED') {
        throw new ApiError(409, 'Only shipped sample orders can be marked delivered')
      }
      updated = await prisma.sampleOrder.update({
        where: { id: order.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      })
    } else if (data.action === 'CANCEL') {
      if (!['PENDING_PAYMENT', 'PENDING_SUPPLIER_CONFIRMATION', 'CONFIRMED'].includes(order.status)) {
        throw new ApiError(409, 'This sample order can no longer be cancelled')
      }
      updated = await prisma.sampleOrder.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })
    }

    const notificationRecipient = supplierAction ? order.buyerId : supplierOwnerId
    if (notificationRecipient) {
      await createNotification({
        userId: notificationRecipient,
        type: 'SAMPLE_ORDER_UPDATE',
        title: 'Sample Order Updated',
        message: `Sample order ${updated.title} is now ${updated.status.replace(/_/g, ' ')}.`,
        data: { sampleOrderId: updated.id, status: updated.status },
      })
    }

    return successResponse(updated, 'Sample order updated')
  } catch (error) {
    return handleApiError(error)
  }
}
