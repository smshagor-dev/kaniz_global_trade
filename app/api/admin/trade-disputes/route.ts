import { NextRequest } from 'next/server'
import { DisputeStatus } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { createNotification } from '@/server/services/notification'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'

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
    if (!dispute) throw new Error('Dispute not found')

    const refundAmount =
      data.resolution === 'BUYER_REFUND'
        ? Number(dispute.escrowAccount.amountHeld)
        : data.resolution === 'PARTIAL_REFUND'
          ? data.refundAmount || 0
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
      data.resolution === 'SUPPLIER_RELEASE'
        ? 'RELEASED'
        : data.resolution === 'REJECT'
          ? 'HELD'
          : 'REFUNDED'

    const orderStatus =
      data.resolution === 'SUPPLIER_RELEASE'
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
          amountReleased: data.resolution === 'SUPPLIER_RELEASE' ? dispute.escrowAccount.amountHeld : dispute.escrowAccount.amountReleased,
          amountRefunded: refundAmount,
          releasedAt: data.resolution === 'SUPPLIER_RELEASE' ? new Date() : dispute.escrowAccount.releasedAt,
          refundedAt: escrowStatus === 'REFUNDED' ? new Date() : dispute.escrowAccount.refundedAt,
        },
      })

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

    return successResponse(updated, 'Dispute resolved')
  } catch (error) {
    return handleApiError(error)
  }
}
