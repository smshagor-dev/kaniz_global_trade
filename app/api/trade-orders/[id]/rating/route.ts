import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { refreshCompanyCreditProfile, refreshUserCreditProfile } from '@/lib/trust/credit-score'

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  qualityRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  title: z.string().optional(),
  comment: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const order = await prisma.tradeOrder.findUnique({ where: { id } })
    if (!order) throw new ApiError(404, 'Trade order not found')
    if (order.buyerId !== authUser.userId && order.supplierCompanyId !== authUser.companyId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new ApiError(403, 'Access denied')
    }

    const ratings = await prisma.transactionRating.findMany({ where: { tradeOrderId: id }, orderBy: { createdAt: 'desc' } })
    return successResponse(ratings, 'Ratings fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const data = schema.parse(await req.json())
    const order = await prisma.tradeOrder.findUnique({
      where: { id },
      include: {
        quotation: {
          select: {
            inquiry: {
              select: {
                productId: true,
              },
            },
          },
        },
      },
    })
    if (!order) throw new ApiError(404, 'Trade order not found')
    const isBuyer = order.buyerId === authUser.userId
    const isSupplier = authUser.companyId === order.supplierCompanyId
    if (!isBuyer && !isSupplier && !authUser.roles.includes(ROLES.SUPER_ADMIN)) throw new ApiError(403, 'Access denied')
    if (order.status !== 'COMPLETED') throw new ApiError(409, 'Ratings can only be submitted after the trade order is completed')

    const existingRating = await prisma.transactionRating.findFirst({
      where: {
        tradeOrderId: order.id,
        authorUserId: authUser.userId,
      },
    })
    if (existingRating) throw new ApiError(409, 'You have already submitted a rating for this trade order')

    const recipient =
      isBuyer
        ? { recipientCompanyId: order.supplierCompanyId, recipientUserId: null }
        : { recipientUserId: order.buyerId, recipientCompanyId: null }

    const rating = await prisma.transactionRating.create({
      data: {
        tradeOrderId: order.id,
        authorUserId: authUser.userId,
        rating: data.rating,
        qualityRating: data.qualityRating,
        communicationRating: data.communicationRating,
        deliveryRating: data.deliveryRating,
        title: data.title,
        comment: data.comment,
        productId: isBuyer ? order.quotation.inquiry?.productId || null : null,
        ...recipient,
      },
    })

    if (recipient.recipientCompanyId) await refreshCompanyCreditProfile(recipient.recipientCompanyId)
    if (recipient.recipientUserId) await refreshUserCreditProfile(recipient.recipientUserId)

    return successResponse(rating, 'Transaction rating saved', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
