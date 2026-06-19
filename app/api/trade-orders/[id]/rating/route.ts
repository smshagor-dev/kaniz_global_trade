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
    const order = await prisma.tradeOrder.findUnique({ where: { id } })
    if (!order) throw new ApiError(404, 'Trade order not found')
    if (![order.buyerId, order.supplierCompanyId].includes(authUser.userId) && authUser.companyId !== order.supplierCompanyId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      if (order.buyerId !== authUser.userId) throw new ApiError(403, 'Access denied')
    }

    const recipient =
      order.buyerId === authUser.userId
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
