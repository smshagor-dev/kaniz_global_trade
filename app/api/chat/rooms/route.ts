import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)

    const [rooms, total] = await Promise.all([
      prisma.chatRoom.findMany({
        where: {
          participants: {
            some: { userId: authUser.userId, isBlocked: false },
          },
        },
        skip,
        take: limit,
        orderBy: { lastMsgAt: 'desc' },
        include: {
          participants: {
            where: { userId: { not: authUser.userId } },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { firstName: true } } },
          },
          _count: {
            select: {
              messages: {
                where: {
                  readReceipts: { none: { userId: authUser.userId } },
                  senderId: { not: authUser.userId },
                },
              },
            },
          },
        },
      }),
      prisma.chatRoom.count({
        where: {
          participants: { some: { userId: authUser.userId, isBlocked: false } },
        },
      }),
    ])

    return successResponse(rooms, 'Chat rooms fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const { participantId, companyId, inquiryId } = z.object({
      participantId: z.string(),
      companyId: z.string().optional(),
      inquiryId: z.string().optional(),
    }).parse(await req.json())

    if (participantId === authUser.userId) throw new ApiError(400, 'Cannot chat with yourself')

    // Check if room already exists between these two users
    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        isGroup: false,
        participants: {
          every: { userId: { in: [authUser.userId, participantId] } },
        },
      },
      include: { participants: true },
    })

    if (existingRoom && existingRoom.participants.length === 2) {
      return successResponse(existingRoom, 'Existing chat room')
    }

    const room = await prisma.chatRoom.create({
      data: {
        companyId,
        inquiryId,
        participants: {
          createMany: {
            data: [
              { userId: authUser.userId },
              { userId: participantId },
            ],
          },
        },
      },
      include: { participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } } },
    })

    return successResponse(room, 'Chat room created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
