import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ApiError, isAdmin, ROLES, requireRole, requireVerifiedBuyer, requireVerifiedSupplier } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { FraudEventType } from '@prisma/client'
import { assertFraudActionAllowed, screenFraudEvent } from '@/lib/fraud/service'
import { FRAUD_ACTIONS } from '@/lib/fraud/shared'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (
      !isAdmin(authUser) &&
      !authUser.roles.includes(ROLES.BUYER) &&
      !authUser.roles.includes(ROLES.SUPPLIER_OWNER) &&
      !authUser.roles.includes(ROLES.SUPPLIER_STAFF)
    ) {
      throw new ApiError(403, 'Marketplace chat access required')
    }
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
        orderBy: [{ lastMsgAt: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
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
    const authUser = await requireRole(req, ROLES.BUYER, ROLES.SUPPLIER_OWNER, ROLES.SUPPLIER_STAFF, ROLES.ADMIN, ROLES.SUPER_ADMIN)
    const { participantId, companyId, inquiryId } = z.object({
      participantId: z.string(),
      companyId: z.string().optional(),
      inquiryId: z.string().optional(),
    }).parse(await req.json())

    if (participantId === authUser.userId) throw new ApiError(400, 'Cannot chat with yourself')
    const participant = await prisma.user.findUnique({
      where: { id: participantId, deletedAt: null },
      select: {
        id: true,
        roles: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        companyUsers: {
          select: {
            companyId: true,
          },
        },
      },
    })
    if (!participant) throw new ApiError(404, 'Participant not found')

    const participantRoles = participant.roles.map((entry) => entry.role.name)
    const participantCompanyIds = participant.companyUsers.map((entry) => entry.companyId)
    const participantIsAdmin = participantRoles.some((role) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN)
    const isAdminRoom = isAdmin(authUser) || participantIsAdmin

    if (isAdminRoom && !isAdmin(authUser)) {
      throw new ApiError(403, 'Admin chat access required')
    }

    if (!isAdminRoom) {
      if (authUser.roles.includes(ROLES.BUYER)) {
        await requireVerifiedBuyer(authUser)
      } else {
        await requireVerifiedSupplier(authUser, companyId || authUser.companyId)
      }

      if (!companyId) {
        throw new ApiError(400, 'companyId is required for buyer and supplier chat rooms')
      }

      const buyerUserId = authUser.roles.includes(ROLES.BUYER) ? authUser.userId : participantId
      const supplierUserBelongsToCompany = authUser.roles.includes(ROLES.BUYER)
        ? participantCompanyIds.includes(companyId)
        : authUser.companyId === companyId
      const participantIsBuyer = participantRoles.includes(ROLES.BUYER)

      const linkedInquiry = inquiryId
        ? await prisma.inquiry.findUnique({
            where: { id: inquiryId, deletedAt: null },
            select: { id: true, buyerId: true, companyId: true },
          })
        : null

      if (linkedInquiry) {
        const inquiryMatches = linkedInquiry.buyerId === buyerUserId && linkedInquiry.companyId === companyId
        if (!inquiryMatches) {
          throw new ApiError(403, 'The selected inquiry does not match this buyer and supplier relationship')
        }
      }

      const [quotation, tradeOrder, inquiry] = await Promise.all([
        prisma.rFQQuotation.findFirst({
          where: {
            companyId,
            buyerId: buyerUserId,
          },
          select: { id: true },
        }),
        prisma.tradeOrder.findFirst({
          where: {
            supplierCompanyId: companyId,
            buyerId: buyerUserId,
          },
          select: { id: true },
        }),
        linkedInquiry
          ? Promise.resolve(linkedInquiry)
          : prisma.inquiry.findFirst({
              where: {
                deletedAt: null,
                companyId,
                buyerId: buyerUserId,
              },
              select: { id: true },
            }),
      ])

      if (
        !supplierUserBelongsToCompany ||
        (authUser.roles.includes(ROLES.BUYER) ? participantIsBuyer : !participantIsBuyer) ||
        !(quotation || tradeOrder || inquiry)
      ) {
        throw new ApiError(403, 'A valid buyer and supplier relationship is required for this negotiation room')
      }
    }

    await assertFraudActionAllowed({
      userId: authUser.userId,
      companyId,
      action: FRAUD_ACTIONS.MESSAGE_SEND,
    })

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
              { userId: authUser.userId, isAdmin: isAdmin(authUser) },
              { userId: participantId, isAdmin: participantIsAdmin },
            ],
          },
        },
      },
      include: { participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } } },
    })

    await screenFraudEvent({
      req,
      actorUserId: authUser.userId,
      userId: authUser.userId,
      companyId,
      eventType: FraudEventType.SUSPICIOUS_ACTIVITY,
      sourceModule: 'chat/rooms',
      title: 'Chat room created',
      summary: 'Buyer or supplier started a new live chat room.',
      payload: {
        participantId,
        companyId,
        inquiryId,
      },
    })

    return successResponse(room, 'Chat room created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
