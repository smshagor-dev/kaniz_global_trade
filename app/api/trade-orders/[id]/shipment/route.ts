import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError, requireVerifiedSupplier } from '@/lib/permissions'
import { buildTrackingUrl, syncCarrierTracking } from '@/lib/shipping/tracking'
import { createNotification } from '@/server/services/notification'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { logShipmentStatusEvent } from '@/lib/monitoring/event-helpers'

const shipmentSchema = z.object({
  carrier: z.string().min(2),
  trackingNumber: z.string().min(3),
  awbNumber: z.string().optional(),
  serviceLevel: z.string().optional(),
  originCountryId: z.string().optional(),
  destinationCountryId: z.string().optional(),
  estimatedDeliveryAt: z.string().optional(),
})

const shipmentUpdateSchema = z.object({
  shipmentId: z.string().optional(),
  action: z.enum(['SYNC', 'UPDATE_STATUS', 'MARK_DELIVERED']),
  status: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const order = await prisma.tradeOrder.findUnique({
      where: { id },
      include: {
        shipments: {
          include: { events: { orderBy: { eventTime: 'desc' } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!order) throw new ApiError(404, 'Trade order not found')
    if (
      order.buyerId !== authUser.userId &&
      order.supplierCompanyId !== authUser.companyId &&
      !authUser.roles.includes(ROLES.SUPER_ADMIN) &&
      !authUser.roles.includes(ROLES.ADMIN)
    ) {
      throw new ApiError(403, 'Access denied')
    }

    return successResponse(order.shipments, 'Shipments fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const data = shipmentSchema.parse(await req.json())

    const order = await prisma.tradeOrder.findUnique({ where: { id } })
    if (!order) throw new ApiError(404, 'Trade order not found')
    if (order.supplierCompanyId !== authUser.companyId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new ApiError(403, 'Supplier access required')
    }
    if (!authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      await requireVerifiedSupplier(authUser, order.supplierCompanyId)
    }
    if (!['ESCROW_FUNDED', 'PROCESSING', 'SHIPPED'].includes(order.status)) {
      throw new ApiError(409, 'Shipment can only be created after escrow is funded and before the order is completed')
    }

    const trackingUrl = await buildTrackingUrl(data.carrier, data.trackingNumber)
    const sync = await syncCarrierTracking(data.carrier, data.trackingNumber)

    const shipment = await prisma.$transaction(async (tx) => {
      const created = await tx.shipment.create({
        data: {
          tradeOrderId: order.id,
          buyerId: order.buyerId,
          supplierCompanyId: order.supplierCompanyId,
          carrier: data.carrier.toUpperCase(),
          trackingNumber: data.trackingNumber,
          awbNumber: data.awbNumber,
          trackingUrl: trackingUrl || null,
          serviceLevel: data.serviceLevel,
          originCountryId: data.originCountryId,
          destinationCountryId: data.destinationCountryId,
          estimatedDeliveryAt: data.estimatedDeliveryAt ? new Date(data.estimatedDeliveryAt) : null,
          status: sync?.status || 'LABEL_CREATED',
          shippedAt: new Date(),
          lastEvent: sync?.lastEvent || 'Shipment created',
          lastLocation: sync?.lastLocation,
          lastSyncedAt: sync ? new Date() : null,
          metadata: sync?.rawPayload || null,
        },
      })

      await tx.shipmentEvent.create({
        data: {
          shipmentId: created.id,
          status: sync?.status || 'LABEL_CREATED',
          description: sync?.lastEvent || 'Shipment created',
          location: sync?.lastLocation,
          eventTime: new Date(),
          rawPayload: sync?.rawPayload,
        },
      })

      await tx.tradeOrder.update({
        where: { id: order.id },
        data: { status: 'SHIPPED', shippedAt: new Date() },
      })

      return tx.shipment.findUniqueOrThrow({
        where: { id: created.id },
        include: { events: { orderBy: { eventTime: 'desc' } } },
      })
    })

    await createNotification({
      userId: order.buyerId,
      type: 'SHIPMENT_UPDATE',
      title: 'Shipment Created',
      message: `Your order ${order.productName} has been shipped via ${data.carrier.toUpperCase()}.`,
      data: { tradeOrderId: order.id, shipmentId: shipment.id, trackingNumber: shipment.trackingNumber },
    })

    await logShipmentStatusEvent({
      shipmentId: shipment.id,
      tradeOrderId: order.id,
      status: shipment.status,
      actorUserId: authUser.userId,
      companyId: order.supplierCompanyId,
      details: {
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
      },
    })

    return successResponse(shipment, 'Shipment created', undefined, 201)
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
    const data = shipmentUpdateSchema.parse(await req.json())

    const order = await prisma.tradeOrder.findUnique({
      where: { id },
      include: { shipments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    if (!order) throw new ApiError(404, 'Trade order not found')

    const shipmentId = data.shipmentId || order.shipments[0]?.id
    if (!shipmentId) throw new ApiError(404, 'Shipment not found')

    if (
      order.buyerId !== authUser.userId &&
      order.supplierCompanyId !== authUser.companyId &&
      !authUser.roles.includes(ROLES.SUPER_ADMIN)
    ) {
      throw new ApiError(403, 'Access denied')
    }

    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } })
    if (!shipment) throw new ApiError(404, 'Shipment not found')

    let nextStatus = shipment.status
    let description = data.description || shipment.lastEvent || 'Shipment updated'
    let location = data.location || shipment.lastLocation || null
    let rawPayload: string | undefined

    if (data.action === 'SYNC') {
      const sync = await syncCarrierTracking(shipment.carrier, shipment.trackingNumber)
      if (sync) {
        nextStatus = sync.status
        description = sync.lastEvent
        location = sync.lastLocation || null
        rawPayload = sync.rawPayload || undefined
      }
    } else if (data.action === 'MARK_DELIVERED') {
      nextStatus = 'DELIVERED'
      description = data.description || 'Shipment marked delivered'
    } else if (data.status) {
      nextStatus = data.status as typeof shipment.status
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: nextStatus,
          deliveredAt: nextStatus === 'DELIVERED' ? new Date() : shipment.deliveredAt,
          lastEvent: description,
          lastLocation: location,
          lastSyncedAt: new Date(),
          metadata: rawPayload || shipment.metadata,
        },
      })

      await tx.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          status: nextStatus,
          description,
          location,
          eventTime: new Date(),
          rawPayload,
        },
      })

      if (nextStatus === 'DELIVERED') {
        await tx.tradeOrder.update({
          where: { id: order.id },
          data: { status: 'DELIVERED', deliveredAt: new Date() },
        })
      }

      return saved
    })

    await createNotification({
      userId: order.buyerId,
      type: 'SHIPMENT_UPDATE',
      title: 'Shipment Updated',
      message: description,
      data: { tradeOrderId: order.id, shipmentId: shipment.id, status: nextStatus },
    })

    await logShipmentStatusEvent({
      shipmentId: shipment.id,
      tradeOrderId: order.id,
      status: nextStatus,
      actorUserId: authUser.userId,
      companyId: order.supplierCompanyId,
      details: {
        action: data.action,
        description,
        location,
      },
    })

    return successResponse(updated, 'Shipment updated')
  } catch (error) {
    return handleApiError(error)
  }
}
