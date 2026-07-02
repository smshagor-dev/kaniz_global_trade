import { recordSystemEvent } from '@/lib/monitoring/system-events'

export async function logAuthFailureEvent(input: {
  message: string
  ipAddress?: string
  email?: string
  reason: string
}) {
  await recordSystemEvent({
    severity: 'WARN',
    category: 'AUTH',
    service: 'auth',
    eventType: 'login_failure',
    message: input.message,
    source: 'auth/login',
    details: {
      ipAddress: input.ipAddress || 'unknown',
      email: input.email || null,
      reason: input.reason,
    },
  })
}

export async function logUploadRejectEvent(input: {
  actorUserId?: string
  companyId?: string
  purpose?: string
  filename?: string
  message: string
  reason: string
}) {
  await recordSystemEvent({
    severity: 'WARN',
    category: 'UPLOAD',
    service: 'upload',
    eventType: 'upload_rejected',
    message: input.message,
    source: 'upload',
    actorUserId: input.actorUserId,
    companyId: input.companyId,
    details: {
      purpose: input.purpose || null,
      filename: input.filename || null,
      reason: input.reason,
    },
  })
}

export async function logPaymentWebhookFailureEvent(input: {
  provider: string
  message: string
  reason: string
  paymentId?: string
  orderId?: string
  actorUserId?: string
  companyId?: string
  details?: unknown
}) {
  await recordSystemEvent({
    severity: 'ERROR',
    category: 'WEBHOOK',
    service: 'payments',
    eventType: `${input.provider.toLowerCase()}_webhook_failure`,
    message: input.message,
    source: `payments/${input.provider.toLowerCase()}/callback`,
    actorUserId: input.actorUserId,
    companyId: input.companyId,
    details: {
      reason: input.reason,
      paymentId: input.paymentId || null,
      orderId: input.orderId || null,
      extra: input.details || null,
    },
  })
}

export async function logPaymentStatusEvent(input: {
  provider: string
  paymentId: string
  status: string
  actorUserId?: string
  companyId?: string
  details?: unknown
}) {
  await recordSystemEvent({
    severity: input.status === 'FAILED' || input.status === 'CANCELLED' ? 'ERROR' : 'INFO',
    category: 'PAYMENT',
    service: 'payments',
    eventType: 'payment_status_changed',
    message: `Payment ${input.paymentId} changed to ${input.status}.`,
    source: `payments/${input.provider.toLowerCase()}`,
    status: input.status,
    actorUserId: input.actorUserId,
    companyId: input.companyId,
    details: input.details,
  })
}

export async function logShipmentStatusEvent(input: {
  shipmentId: string
  tradeOrderId: string
  status: string
  actorUserId?: string
  companyId?: string
  details?: unknown
}) {
  await recordSystemEvent({
    severity: 'INFO',
    category: 'SHIPMENT',
    service: 'shipment',
    eventType: 'shipment_status_changed',
    message: `Shipment ${input.shipmentId} changed to ${input.status}.`,
    source: 'trade-orders/shipment',
    status: input.status,
    actorUserId: input.actorUserId,
    companyId: input.companyId,
    details: {
      tradeOrderId: input.tradeOrderId,
      ...((input.details as Record<string, unknown> | undefined) || {}),
    },
  })
}

export async function logSearchSyncFailureEvent(input: {
  entityType: string
  entityId: string
  action: string
  reason: string
}) {
  await recordSystemEvent({
    severity: 'ERROR',
    category: 'SEARCH',
    service: 'search-sync',
    eventType: 'search_sync_failed',
    message: `Search sync failed for ${input.entityType}:${input.entityId}.`,
    source: 'search/sync',
    details: input,
  })
}
