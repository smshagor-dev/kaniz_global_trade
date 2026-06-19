import prisma from '@/lib/db/prisma'
import { NotificationType } from '@prisma/client'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId: params.userId },
    })

    // Check if user has disabled this type
    const shouldNotify = checkNotificationPref(pref, params.type)
    if (!shouldNotify) return

    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.stringify(params.data) : null,
      },
    })

    // Emit via socket if available (server-side emission handled separately)
    if (global.io) {
      global.io.to(`user:${params.userId}`).emit('notification:new', {
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data,
        createdAt: new Date(),
      })
    }
  } catch (err) {
    console.error('Notification creation error:', err)
  }
}

function checkNotificationPref(pref: {
  inquiryNotif: boolean
  rfqNotif: boolean
  quoteNotif: boolean
  messageNotif: boolean
  productNotif: boolean
  paymentNotif: boolean
  systemNotif: boolean
} | null, type: NotificationType): boolean {
  if (!pref) return true

  switch (type) {
    case 'NEW_INQUIRY': return pref.inquiryNotif
    case 'NEW_RFQ': return pref.rfqNotif
    case 'NEW_QUOTATION': return pref.quoteNotif
    case 'NEW_MESSAGE': return pref.messageNotif
    case 'PRODUCT_APPROVED':
    case 'PRODUCT_REJECTED': return pref.productNotif
    case 'PAYMENT_SUCCESS':
    case 'PAYMENT_FAILED': return pref.paymentNotif
    case 'COMPANY_VERIFIED':
    case 'SUBSCRIPTION_EXPIRING':
    case 'ADMIN_ANNOUNCEMENT': return pref.systemNotif
    default: return true
  }
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  })
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })
}

// Declare global socket
declare global {
  // eslint-disable-next-line no-var
  var io: import('socket.io').Server | undefined
}
