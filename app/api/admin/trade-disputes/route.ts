import { NextRequest } from 'next/server'
import { DisputeStatus } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, requireAdmin } from '@/lib/permissions'
import { createNotification } from '@/server/services/notification'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'
import { calculateTradeOrderFinancialBreakdown } from '@/lib/finance/service-fees'
import { settleTradeCommission } from '@/lib/commerce/revenue'
import { reverseLedgerEntry } from '@/lib/payment/safety'

const resolveDisputeSchema = z.object({
  disputeId: z.string(),
  resolution: z.enum(['BUYER_REFUND', 'SUPPLIER_RELEASE', 'PARTIAL_REFUND', 'REJECT']),
  refundAmount: z.number().nonnegative().optional(),
  resolutionNotes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const status = (searchParams.get('status') as DisputeStatus | null) || undefined
    const where = status ? { status } : {}

    const [disputes, total] = await Promise.all([
      prisma.escrowDispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
          supplierCompany: { select: { id: true, name: true, slug: true } },
          tradeOrder: { select: { id: true, productName: true, totalAmount: true, status: true } },
          escrowAccount: true,
        },
      }),
      prisma.escrowDispute.count({ where }),
    ])

    return successResponse(disputes, 'Trade disputes fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = resolveDisputeSchema.parse(await req.json())

    const dispute = await prisma.escrowDispute.findUnique({
      where: { id: data.disputeId },
      include: { tradeOrder: true, escrowAccount: true },
    })
    if (!dispute) throw new ApiError(404, 'Dispute not found')

    const breakdown = calculateTradeOrderFinancialBreakdown({
      subtotal: Number(dispute.tradeOrder.subtotal),
      shippingCost: Number(dispute.tradeOrder.shippingCost),
      escrowFee: Number(dispute.tradeOrder.escrowFee),
      platformCommissionAmount: Number(dispute.tradeOrder.platformCommissionAmount),
    })
    const amountHeld = Number(dispute.escrowAccount.amountHeld)

    if (data.resolution === 'PARTIAL_REFUND') {
      if (data.refundAmount == null || data.refundAmount <= 0) {
        throw new ApiError(422, 'Partial refund amount is required')
      }
      if (data.refundAmount >= amountHeld) {
        throw new ApiError(422, 'Partial refund amount must be smaller than the total escrow amount')
      }
    }

    const refundAmount =
      data.resolution === 'BUYER_REFUND'
        ? amountHeld
        : data.resolution === 'PARTIAL_REFUND'
          ? data.refundAmount || 0
          : 0

    const amountReleased =
      data.resolution === 'SUPPLIER_RELEASE'
        ? breakdown.supplierNetReceivable
        : data.resolution === 'PARTIAL_REFUND'
          ? Math.max(0, Math.min(breakdown.supplierNetReceivable, amountHeld - refundAmount))
          : 0

    const disputeStatus =
      data.resolution === 'BUYER_REFUND'
        ? 'RESOLVED_BUYER'
        : data.resolution === 'SUPPLIER_RELEASE'
          ? 'RESOLVED_SUPPLIER'
          : data.resolution === 'PARTIAL_REFUND'
            ? 'PARTIAL_REFUND'
            : 'REJECTED'

    const escrowStatus =
      data.resolution === 'SUPPLIER_RELEASE' || data.resolution === 'PARTIAL_REFUND'
        ? 'RELEASED'
        : data.resolution === 'REJECT'
          ? 'HELD'
          : 'REFUNDED'

    const orderStatus =
      data.resolution === 'SUPPLIER_RELEASE' || data.resolution === 'PARTIAL_REFUND'
        ? 'COMPLETED'
        : data.resolution === 'REJECT'
          ? 'ESCROW_FUNDED'
          : 'REFUNDED'

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.escrowDispute.update({
        where: { id: dispute.id },
        data: {
          status: disputeStatus,
          refundAmount,
          resolutionNotes: data.resolutionNotes,
          resolvedBy: admin.userId,
          resolvedAt: new Date(),
        },
      })

      await tx.escrowAccount.update({
        where: { id: dispute.escrowId },
        data: {
          status: escrowStatus,
          amountReleased,
          amountRefunded: refundAmount,
          releasedAt: ['SUPPLIER_RELEASE', 'PARTIAL_REFUND'].includes(data.resolution) ? new Date() : dispute.escrowAccount.releasedAt,
          refundedAt: ['BUYER_REFUND', 'PARTIAL_REFUND'].includes(data.resolution) ? new Date() : dispute.escrowAccount.refundedAt,
        },
      })

      if (data.resolution !== 'REJECT') {
        await tx.escrowTransaction.create({
          data: {
            escrowAccountId: dispute.escrowId,
            tradeOrderId: dispute.tradeOrderId,
            paymentId: dispute.escrowAccount.paymentId ?? undefined,
            type: data.resolution,
            amount: data.resolution === 'BUYER_REFUND' ? refundAmount : amountReleased,
            feeAmount: 0,
            supplierPayable: amountReleased,
            platformProfit: Math.max(0, amountHeld - refundAmount - amountReleased),
            currency: dispute.escrowAccount.currencyCode,
            status: 'COMPLETED',
          },
        })
      }

      await tx.tradeOrder.update({
        where: { id: dispute.tradeOrderId },
        data: {
          status: orderStatus,
          completedAt: orderStatus === 'COMPLETED' ? new Date() : dispute.tradeOrder.completedAt,
          cancelledAt: orderStatus === 'REFUNDED' ? new Date() : dispute.tradeOrder.cancelledAt,
        },
      })

      return saved
    })

    await createNotification({
      userId: dispute.buyerId,
      type: 'DISPUTE_UPDATE',
      title: 'Dispute Resolved',
      message: `Your dispute for ${dispute.tradeOrder.productName} was resolved: ${disputeStatus.replace(/_/g, ' ')}.`,
      data: { disputeId: dispute.id, tradeOrderId: dispute.tradeOrderId, status: disputeStatus },
    })

    if (data.resolution === 'SUPPLIER_RELEASE') {
      await settleTradeCommission(dispute.tradeOrderId)
    } else if (['BUYER_REFUND', 'PARTIAL_REFUND'].includes(data.resolution)) {
      const revenueLedger = await prisma.platformRevenueLedger.findFirst({
        where: {
          tradeOrderId: dispute.tradeOrderId,
          revenueType: 'CREDIT',
        },
        orderBy: { createdAt: 'desc' },
      })

      if (revenueLedger) {
        await reverseLedgerEntry({
          originalLedgerId: revenueLedger.id,
          createdById: admin.userId,
          paymentId: dispute.escrowAccount.paymentId ?? null,
          reason: data.resolutionNotes || `${data.resolution} dispute resolution`,
        })
      }
    }

    return successResponse(updated, 'Dispute resolved')
  } catch (error) {
    return handleApiError(error)
  }
}
