import { Server as SocketServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
import { FraudEventType, FraudRiskLevel } from '@prisma/client'
import { verifyAccessToken } from '../../lib/auth/jwt'
import prisma from '../../lib/db/prisma'
import { setUserOnline, setUserOffline } from '../../lib/db/redis'
import { assertFraudActionAllowed, screenFraudEvent } from '../../lib/fraud/service'
import { FRAUD_ACTIONS } from '../../lib/fraud/shared'
import { createNotification } from '../../server/services/notification'
import { isAdmin, requireChatRoomAccess, requireVerifiedBuyer, requireVerifiedSupplier, ROLES } from '../../lib/permissions'
import { trackCompanyMessage } from '../../lib/analytics/tracking'

interface SocketUser {
  userId: string
  email: string
  roles: string[]
  companyId?: string
}

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser
  }
}

export function initSocketServer(io: SocketServer): void {
  // Redis adapter for scaling, with graceful fallback to the in-memory adapter.
  const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  })
  const subClient = pubClient.duplicate()

  const handleRedisError = (error: Error) => {
    console.warn(`Socket Redis adapter unavailable: ${error.message}`)
  }

  pubClient.on('error', handleRedisError)
  subClient.on('error', handleRedisError)

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient))
      console.log('Socket Redis adapter connected')
    })
    .catch((error) => {
      console.warn(`Socket Redis adapter disabled, using local adapter: ${error.message}`)
    })

  // Auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')

    if (!token) return next(new Error('Authentication required'))

    try {
      const payload = verifyAccessToken(token)
      const user = await prisma.user.findUnique({
        where: { id: payload.userId, deletedAt: null },
        include: {
          roles: { include: { role: true } },
          companyUsers: {
            where: { isPrimary: true },
            select: { companyId: true },
            take: 1,
          },
        },
      })

      if (!user || user.status === 'SUSPENDED' || user.fraudRiskLevel === FraudRiskLevel.BLOCKED) return next(new Error('Invalid user'))

      socket.user = {
        userId: user.id,
        email: user.email,
        roles: user.roles.map((ur) => ur.role.name),
        companyId: user.companyUsers[0]?.companyId,
      }

      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    const user = socket.user!
    console.log(`Socket connected: ${user.userId}`)

    // Join user's personal room
    socket.join(`user:${user.userId}`)

    // Mark as online
    await setUserOnline(user.userId)
    io.emit('user:online', { userId: user.userId })

    // ============================
    // CHAT EVENTS
    // ============================
    socket.on('chat:join', async ({ roomId }) => {
      try {
        await requireChatRoomAccess({
          user,
          roomId,
        })

        socket.join(`room:${roomId}`)
        socket.emit('chat:joined', { roomId })
      } catch (err) {
        socket.emit('error', { message: err instanceof Error ? err.message : 'Failed to join chat' })
      }
    })

    socket.on('chat:leave', ({ roomId }) => {
      socket.leave(`room:${roomId}`)
      socket.emit('chat:left', { roomId })
    })

    socket.on('message:send', async ({ roomId, content, type = 'TEXT', replyToId, attachments }) => {
      try {
        const access = await requireChatRoomAccess({
          user,
          roomId,
        })
        const room = access.room

        await assertFraudActionAllowed({
          userId: user.userId,
          companyId: room?.companyId || undefined,
          action: FRAUD_ACTIONS.MESSAGE_SEND,
        })
        if (!isAdmin({ ...user, permissions: [] as string[], email: user.email })) {
          if (user.roles.includes(ROLES.BUYER)) {
            await requireVerifiedBuyer({ ...user, permissions: [] as string[], email: user.email })
          } else {
            await requireVerifiedSupplier({ ...user, permissions: [] as string[], email: user.email }, room?.companyId || user.companyId)
          }
        }

        socket.join(`room:${roomId}`)

        const message = await prisma.message.create({
          data: {
            roomId,
            senderId: user.userId,
            content,
            type,
            replyToId,
            attachments: attachments?.length
              ? { createMany: { data: attachments } }
              : undefined,
          },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            attachments: true,
          },
        })

        // Update chat room last message
        await prisma.chatRoom.update({
          where: { id: roomId },
          data: { lastMessage: content?.substring(0, 100), lastMsgAt: new Date() },
        })

        if (room?.companyId) {
          await trackCompanyMessage(room.companyId)
        }

        const req = new Request('http://socket.local/message', {
          headers: {
            'user-agent': socket.handshake.headers['user-agent'] || '',
            'x-forwarded-for': Array.isArray(socket.handshake.address) ? socket.handshake.address[0] : socket.handshake.address || 'unknown',
            'x-device-id': String(socket.handshake.auth?.deviceId || ''),
          },
        })

        await screenFraudEvent({
          req,
          actorUserId: user.userId,
          userId: user.userId,
          companyId: room?.companyId || undefined,
          eventType: FraudEventType.SUSPICIOUS_ACTIVITY,
          sourceModule: 'socket/chat',
          title: 'Live chat message sent',
          summary: 'Marketplace live chat message created.',
          payload: {
            roomId,
            type,
            content,
            attachmentCount: attachments?.length || 0,
          },
        })

        // Emit to all participants in room
        io.to(`room:${roomId}`).emit('message:new', message)

        // Send notifications to offline participants
        const participants = await prisma.chatParticipant.findMany({
          where: { roomId, userId: { not: user.userId } },
        })

        for (const p of participants) {
          await createNotification({
            userId: p.userId,
            type: 'NEW_MESSAGE',
            title: 'New message',
            message: `${user.email} sent a message`,
            data: { roomId, messageId: message.id },
          })
          io.to(`user:${p.userId}`).emit('notification:new', {
            type: 'NEW_MESSAGE',
            title: 'New message',
            message: `${user.email} sent a message`,
            data: { roomId, messageId: message.id },
          })
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    socket.on('message:read', async ({ roomId, messageId }) => {
      try {
        await requireChatRoomAccess({
          user,
          roomId,
        })

        await prisma.messageReadReceipt.upsert({
          where: { messageId_userId: { messageId, userId: user.userId } },
          create: { messageId, userId: user.userId },
          update: {},
        })

        await prisma.chatParticipant.updateMany({
          where: { roomId, userId: user.userId },
          data: { lastReadAt: new Date() },
        })

        socket.to(`room:${roomId}`).emit('message:read', { messageId, userId: user.userId })
      } catch { /* non-critical */ }
    })

    socket.on('typing:start', async ({ roomId }) => {
      try {
        await requireChatRoomAccess({
          user,
          roomId,
        })
        socket.to(`room:${roomId}`).emit('typing:start', {
          userId: user.userId,
          roomId,
        })
      } catch { /* non-critical */ }
    })

    socket.on('typing:stop', async ({ roomId }) => {
      try {
        await requireChatRoomAccess({
          user,
          roomId,
        })
        socket.to(`room:${roomId}`).emit('typing:stop', {
          userId: user.userId,
          roomId,
        })
      } catch { /* non-critical */ }
    })

    // ============================
    // DISCONNECT
    // ============================
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${user.userId}`)
      await setUserOffline(user.userId)
      io.emit('user:offline', { userId: user.userId })
    })
  })
}
