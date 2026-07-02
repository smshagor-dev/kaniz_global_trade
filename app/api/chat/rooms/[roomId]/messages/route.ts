import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireChatRoomAccess } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { roomId } = await params
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)

    await requireChatRoomAccess({
      user: authUser,
      roomId,
    })

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { roomId, isDeleted: false },
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          attachments: true,
          readReceipts: { select: { userId: true, readAt: true } },
        },
      }),
      prisma.message.count({ where: { roomId, isDeleted: false } }),
    ])

    // Mark all as read
    prisma.chatParticipant.update({
      where: { roomId_userId: { roomId, userId: authUser.userId } },
      data: { lastReadAt: new Date() },
    }).catch(() => {})

    return successResponse(messages.reverse(), 'Messages fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}
