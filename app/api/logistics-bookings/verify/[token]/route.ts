import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { formatLogisticsBooking } from '@/lib/logistics/booking'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params
    const booking = await prisma.logisticsBooking.findFirst({
      where: { metadata: { contains: token } },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        tradeOrder: { select: { id: true, productName: true } },
        sampleOrder: { select: { id: true, title: true } },
      },
    })

    if (!booking) {
      return Response.json(
        { success: false, message: 'Verification record not found' },
        { status: 404 }
      )
    }

    const formatted = formatLogisticsBooking(booking)
    if (formatted.verificationToken !== token) {
      return Response.json(
        { success: false, message: 'Verification record not found' },
        { status: 404 }
      )
    }

    return successResponse(formatted, 'Logistics verification fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
