import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError, isAdmin, requireVerifiedBuyer, requireVerifiedSupplier } from '@/lib/permissions'
import { createNotification } from '@/server/services/notification'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { settleTradeCommission } from '@/lib/commerce/revenue'
import { calculateTradeOrderFinancialBreakdown } from '@/lib/finance/service-fees'

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
      if (!isAdmin(authUser)) {
        await requireVerifiedSupplier(authUser, order.supplierCompanyId)
      }
      if (order.escrowAccount.status !== 'HELD') {
        throw new ApiError(409, 'Escrow release can only be requested after escrow funding is complete')
      }
      if (!['ESCROW_FUNDED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
        throw new ApiError(409, 'Release request is not available for the current trade order status')
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
    if (!isAdmin(authUser)) {
      await requireVerifiedBuyer(authUser)
    }
    if (!['HELD', 'RELEASE_REQUESTED'].includes(order.escrowAccount.status)) {
      throw new ApiError(409, 'Escrow is not ready to be released')
    }
    if (!['ESCROW_FUNDED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
      throw new ApiError(409, 'This trade order cannot be released in its current status')
    }

    const breakdown = calculateTradeOrderFinancialBreakdown({
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      escrowFee: Number(order.escrowFee),
      platformCommissionAmount: Number(order.platformCommissionAmount),
    })

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.escrowAccount.update({
        where: { id: order.escrowAccount!.id },
        data: {
          status: 'RELEASED',
          amountReleased: breakdown.supplierNetReceivable,
          releasedAt: new Date(),
          releaseNotes: data.notes,
        },
      })

      await tx.escrowTransaction.create({
        data: {
          escrowAccountId: order.escrowAccount!.id,
          tradeOrderId: order.id,
          paymentId: order.escrowAccount!.paymentId ?? undefined,
          type: 'RELEASE',
          amount: breakdown.supplierNetReceivable,
          feeAmount: 0,
          supplierPayable: breakdown.supplierNetReceivable,
          platformProfit: breakdown.platformRetainedTotal,
          currency: order.currencyCode,
          status: 'COMPLETED',
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
