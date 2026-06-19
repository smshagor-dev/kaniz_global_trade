import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { markAllNotificationsRead } from '@/server/services/notification'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const unreadOnly = searchParams.get('unread') === 'true'

    const where: Record<string, unknown> = { userId: authUser.userId }
    if (unreadOnly) where.isRead = false

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: authUser.userId, isRead: false } }),
    ])

    return successResponse(
      { notifications, unreadCount },
      'Notifications fetched',
      paginationMeta(total, page, limit)
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    await markAllNotificationsRead(authUser.userId)
    return successResponse(null, 'All notifications marked as read')
  } catch (error) {
    return handleApiError(error)
  }
}
