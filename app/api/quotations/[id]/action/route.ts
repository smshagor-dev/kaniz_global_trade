import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { createTradeOrderFromQuotation } from '@/lib/trade/create-trade-order'
import { successResponse, handleApiError } from '@/lib/utils/api'
import { createNotification } from '@/server/services/notification'

const actionSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT', 'VIEW']),
  reason: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const { action, reason } = actionSchema.parse(await req.json())

    const quotation = await prisma.rFQQuotation.findUnique({
      where: { id },
      include: { company: { select: { name: true, companyUsers: { where: { isPrimary: true }, select: { userId: true } } } } },
    })

    if (!quotation) throw new ApiError(404, 'Quotation not found')

    // Only the buyer can accept/reject
    if (quotation.buyerId !== authUser.userId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new ApiError(403, 'Access denied')
    }

    const updateData: Record<string, unknown> = {}

    if (action === 'VIEW') {
      updateData.status = quotation.status === 'SENT' ? 'VIEWED' : quotation.status
      updateData.viewedAt = new Date()
    } else if (action === 'ACCEPT') {
      updateData.status = 'ACCEPTED'
      updateData.acceptedAt = new Date()
    } else if (action === 'REJECT') {
      updateData.status = 'REJECTED'
      updateData.rejectedAt = new Date()
      updateData.rejectedReason = reason
    }

    const updated = await prisma.rFQQuotation.update({
      where: { id },
      data: updateData,
    })

    let tradeOrder = null
    if (action === 'ACCEPT') {
      tradeOrder = await createTradeOrderFromQuotation({
        quotationId: quotation.id,
        buyerId: authUser.userId,
      })
    }

    // Notify supplier
    const supplierOwnerId = quotation.company.companyUsers[0]?.userId
    if (supplierOwnerId && action !== 'VIEW') {
      await createNotification({
        userId: supplierOwnerId,
        type: 'NEW_QUOTATION',
        title: `Quotation ${action === 'ACCEPT' ? 'Accepted' : 'Rejected'}`,
        message: action === 'ACCEPT'
          ? 'Your quotation was accepted by the buyer and moved into trade assurance escrow.'
          : `Your quotation was rejected. ${reason || ''}`,
        data: { quotationId: quotation.id, tradeOrderId: tradeOrder?.id },
      })
    }

    return successResponse({ quotation: updated, tradeOrder }, `Quotation ${action.toLowerCase()}ed`)
  } catch (error) {
    return handleApiError(error)
  }
}
