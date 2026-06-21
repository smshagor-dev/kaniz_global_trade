import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, isAdmin, requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { createNotification } from '@/server/services/notification'

const replySchema = z.object({
  message: z.string().trim().min(5).max(5000),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const { message } = replySchema.parse(await req.json())

    const inquiry = await prisma.inquiry.findUnique({
      where: { id, deletedAt: null },
      include: {
        buyer: { select: { id: true, firstName: true } },
        company: {
          select: {
            id: true,
            name: true,
            companyUsers: {
              where: { isPrimary: true },
              take: 1,
              select: { userId: true, user: { select: { firstName: true } } },
            },
          },
        },
      },
    })

    if (!inquiry) throw new ApiError(404, 'Inquiry not found')

    const isBuyerOwner = inquiry.buyerId === authUser.userId
    const isSupplierMember = !!authUser.companyId && inquiry.companyId === authUser.companyId

    if (!isBuyerOwner && !isSupplierMember && !isAdmin(authUser)) {
      throw new ApiError(403, 'Access denied')
    }

    const isSupplierSide = isSupplierMember || (isAdmin(authUser) && inquiry.buyerId !== authUser.userId)
    const nextStatus = isSupplierSide ? 'REPLIED' : 'OPEN'

    const reply = await prisma.$transaction(async (tx) => {
      const createdReply = await tx.inquiryReply.create({
        data: {
          inquiryId: inquiry.id,
          senderId: authUser.userId,
          message,
        },
      })

      await tx.inquiry.update({
        where: { id: inquiry.id },
        data: {
          status: nextStatus,
          isRead: isSupplierSide ? true : false,
        },
      })

      return createdReply
    })

    const sender = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
    })

    const recipientId = isSupplierSide
      ? inquiry.buyerId
      : inquiry.company.companyUsers[0]?.userId

    if (recipientId) {
      await createNotification({
        userId: recipientId,
        type: 'NEW_MESSAGE',
        title: 'New Inquiry Reply',
        message: `${authUser.email} replied to inquiry "${inquiry.subject}"`,
        data: { inquiryId: inquiry.id },
      })
    }

    return successResponse({ ...reply, sender }, 'Reply sent successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
