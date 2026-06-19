import { Server as SocketServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
import { verifyAccessToken } from '@/lib/auth/jwt'
import prisma from '@/lib/db/prisma'
import { setUserOnline, setUserOffline } from '@/lib/db/redis'

interface SocketUser {
  userId: string
  email: string
  roles: string[]
}

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser
  }
}

export function initSocketServer(io: SocketServer): void {
  // Redis adapter for scaling
  const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
  const subClient = pubClient.duplicate()
  io.adapter(createAdapter(pubClient, subClient))

  // Auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')

    if (!token) return next(new Error('Authentication required'))

    try {
      const payload = verifyAccessToken(token)
      const user = await prisma.user.findUnique({
        where: { id: payload.userId, deletedAt: null },
        include: { roles: { include: { role: true } } },
      })

      if (!user || user.status === 'SUSPENDED') return next(new Error('Invalid user'))

      socket.user = {
        userId: user.id,
        email: user.email,
        roles: user.roles.map((ur) => ur.role.name),
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
        const participant = await prisma.chatParticipant.findUnique({
          where: { roomId_userId: { roomId, userId: user.userId } },
        })
        if (!participant || participant.isBlocked) return

        socket.join(`room:${roomId}`)
        socket.emit('chat:joined', { roomId })
      } catch (err) {
        socket.emit('error', { message: 'Failed to join chat' })
      }
    })

    socket.on('chat:leave', ({ roomId }) => {
      socket.leave(`room:${roomId}`)
      socket.emit('chat:left', { roomId })
    })

    socket.on('message:send', async ({ roomId, content, type = 'TEXT', replyToId, attachments }) => {
      try {
        const participant = await prisma.chatParticipant.findUnique({
          where: { roomId_userId: { roomId, userId: user.userId } },
        })
        if (!participant || participant.isBlocked) return

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

        // Emit to all participants in room
        io.to(`room:${roomId}`).emit('message:new', message)

        // Send notifications to offline participants
        const participants = await prisma.chatParticipant.findMany({
          where: { roomId, userId: { not: user.userId } },
        })

        for (const p of participants) {
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

    socket.on('typing:start', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('typing:start', {
        userId: user.userId,
        roomId,
      })
    })

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('typing:stop', {
        userId: user.userId,
        roomId,
      })
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
