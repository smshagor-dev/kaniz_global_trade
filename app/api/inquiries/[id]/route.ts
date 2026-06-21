import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { ApiError, isAdmin, requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

async function getInquiryForUser(inquiryId: string, authUser: Awaited<ReturnType<typeof requireAuth>>) {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId, deletedAt: null },
    include: {
      buyer: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          companyUsers: {
            where: { isPrimary: true },
            take: 1,
            select: {
              userId: true,
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      attachments: true,
      replies: {
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { replies: true } },
    },
  })

  if (!inquiry) throw new ApiError(404, 'Inquiry not found')

  const isBuyerOwner = inquiry.buyerId === authUser.userId
  const isSupplierMember = !!authUser.companyId && inquiry.companyId === authUser.companyId

  if (!isBuyerOwner && !isSupplierMember && !isAdmin(authUser)) {
    throw new ApiError(403, 'Access denied')
  }

  const senderIds = [...new Set(inquiry.replies.map((reply) => reply.senderId))]
  const senders = senderIds.length
    ? await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
    })
    : []
  const senderMap = new Map(senders.map((sender) => [sender.id, sender]))

  return {
    inquiry: {
      ...inquiry,
      replies: inquiry.replies.map((reply) => ({
        ...reply,
        sender: senderMap.get(reply.senderId) || null,
      })),
    },
    isBuyerOwner,
    isSupplierMember,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const { inquiry, isSupplierMember } = await getInquiryForUser(id, authUser)

    if (isSupplierMember && !inquiry.isRead) {
      await prisma.inquiry.update({
        where: { id: inquiry.id },
        data: { isRead: true },
      })
      inquiry.isRead = true
    }

    return successResponse(inquiry, 'Inquiry fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
