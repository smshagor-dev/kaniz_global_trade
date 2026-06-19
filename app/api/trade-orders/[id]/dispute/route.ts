import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { createNotification } from '@/server/services/notification'
import { handleApiError, successResponse } from '@/lib/utils/api'

const disputeSchema = z.object({
  reason: z.string().min(3),
  description: z.string().min(10),
  evidenceUrls: z.array(z.string().url()).default([]),
  refundAmount: z.number().nonnegative().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const data = disputeSchema.parse(await req.json())

    const order = await prisma.tradeOrder.findUnique({
      where: { id },
      include: {
        escrowAccount: true,
        supplierCompany: { include: { companyUsers: { where: { isPrimary: true }, select: { userId: true } } } },
      },
    })

    if (!order || !order.escrowAccount) throw new ApiError(404, 'Trade order not found')
    if (order.buyerId !== authUser.userId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) throw new ApiError(403, 'Buyer access required')

    const dispute = await prisma.$transaction(async (tx) => {
      const created = await tx.escrowDispute.create({
        data: {
          tradeOrderId: order.id,
          escrowId: order.escrowAccount!.id,
          buyerId: authUser.userId,
          supplierCompanyId: order.supplierCompanyId,
          reason: data.reason,
          description: data.description,
          evidenceUrls: JSON.stringify(data.evidenceUrls),
          refundAmount: data.refundAmount,
        },
      })

      await tx.escrowAccount.update({
        where: { id: order.escrowAccount!.id },
        data: { status: 'DISPUTED' },
      })

      await tx.tradeOrder.update({
        where: { id: order.id },
        data: { status: 'DISPUTED' },
      })

      return created
    })

    const supplierOwnerId = order.supplierCompany.companyUsers[0]?.userId
    if (supplierOwnerId) {
      await createNotification({
        userId: supplierOwnerId,
        type: 'DISPUTE_UPDATE',
        title: 'Escrow Dispute Opened',
        message: `Buyer opened a dispute for ${order.productName}.`,
        data: { tradeOrderId: order.id, disputeId: dispute.id },
      })
    }

    return successResponse(dispute, 'Dispute opened successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
