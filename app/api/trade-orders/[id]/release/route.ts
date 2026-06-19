import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { createNotification } from '@/server/services/notification'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { settleTradeCommission } from '@/lib/commerce/revenue'

const releaseSchema = z.object({
  action: z.enum(['REQUEST_RELEASE', 'RELEASE']),
  notes: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const data = releaseSchema.parse(await req.json())

    const order = await prisma.tradeOrder.findUnique({
      where: { id },
      include: {
        escrowAccount: true,
        supplierCompany: { include: { companyUsers: { where: { isPrimary: true }, select: { userId: true } } } },
      },
    })

    if (!order || !order.escrowAccount) throw new ApiError(404, 'Trade order not found')

    if (data.action === 'REQUEST_RELEASE') {
      if (order.supplierCompanyId !== authUser.companyId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
        throw new ApiError(403, 'Supplier access required')
      }

      const updated = await prisma.escrowAccount.update({
        where: { id: order.escrowAccount.id },
        data: {
          status: 'RELEASE_REQUESTED',
          releaseRequestedAt: new Date(),
          releaseNotes: data.notes,
        },
      })

      await createNotification({
        userId: order.buyerId,
        type: 'ESCROW_UPDATE',
        title: 'Release Requested',
        message: `Supplier requested escrow release for ${order.productName}.`,
        data: { tradeOrderId: order.id },
      })

      return successResponse(updated, 'Escrow release requested')
    }

    if (order.buyerId !== authUser.userId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new ApiError(403, 'Buyer access required')
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.escrowAccount.update({
        where: { id: order.escrowAccount!.id },
        data: {
          status: 'RELEASED',
          amountReleased: order.escrowAccount!.amountHeld,
          releasedAt: new Date(),
          releaseNotes: data.notes,
        },
      })

      return tx.tradeOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          deliveredAt: order.deliveredAt || new Date(),
        },
        include: { escrowAccount: true },
      })
    })

    await settleTradeCommission(order.id)

    const supplierOwnerId = order.supplierCompany.companyUsers[0]?.userId
    if (supplierOwnerId) {
      await createNotification({
        userId: supplierOwnerId,
        type: 'ESCROW_UPDATE',
        title: 'Escrow Released',
        message: `Buyer released escrow for ${order.productName}.`,
        data: { tradeOrderId: order.id },
      })
    }

    return successResponse(updatedOrder, 'Escrow released successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
