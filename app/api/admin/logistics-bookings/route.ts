import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const updateSchema = z.object({
  bookingId: z.string(),
  status: z.enum(['BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
  trackingNumber: z.string().optional(),
  finalCost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const bookings = await prisma.logisticsBooking.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        tradeOrder: { select: { id: true, productName: true } },
        sampleOrder: { select: { id: true, title: true } },
      },
    })
    return successResponse(bookings, 'Admin logistics bookings fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req)
    const data = updateSchema.parse(await req.json())
    const updated = await prisma.logisticsBooking.update({
      where: { id: data.bookingId },
      data: {
        status: data.status,
        trackingNumber: data.trackingNumber,
        finalCost: data.finalCost,
        bookedAt: data.status === 'BOOKED' ? new Date() : undefined,
        deliveredAt: data.status === 'DELIVERED' ? new Date() : undefined,
        notes: data.notes,
      },
    })
    return successResponse(updated, 'Logistics booking updated')
  } catch (error) {
    return handleApiError(error)
  }
}
