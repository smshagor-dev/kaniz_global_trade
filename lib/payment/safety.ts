import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { FeeCalculationService, FeeSnapshotInput, RevenueLedgerInput } from '@/lib/finance/service-fees'
import { AuthUser, ApiError, isAdmin } from '@/lib/permissions'
import { constructWebhookEvent } from '@/lib/payment/stripe'
import { NOWPaymentsIpnPayload, verifyNOWPaymentsIpnSignature } from '@/lib/payment/nowpayments'

type DbClient = typeof prisma

type PaymentRecord = {
  id: string
  userId: string
  tradeOrderId?: string | null
  sampleOrderId?: string | null
  invoice?: {
    subscription?: {
      companyId?: string | null
    } | null
  } | null
  tradeOrder?: {
    supplierCompanyId: string
  } | null
  sampleOrder?: {
    supplierCompanyId: string
  } | null
  metadata?: string | null
  status?: string
}

type ParsedPaymentMetadata = Record<string, unknown> & {
  processedWebhookKeys?: string[]
}

type WebhookProvider = 'STRIPE' | 'NOWPAYMENTS' | 'SSLCOMMERZ' | 'AAMARPAY'

function parsePaymentMetadata(value: string | null | undefined): ParsedPaymentMetadata {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value) as ParsedPaymentMetadata
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function stringifyPaymentMetadata(value: ParsedPaymentMetadata) {
  return JSON.stringify(value)
}

const FORWARD_PAYMENT_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PAID', 'FAILED', 'CANCELLED'],
  PAID: ['REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
}

export async function verifyWebhookSignature(input: {
  provider: WebhookProvider
  req: NextRequest
  rawBody: string
}) {
  if (input.provider === 'STRIPE') {
    const signature = input.req.headers.get('stripe-signature')
    if (!signature) {
      throw new ApiError(400, 'Missing Stripe signature')
    }

    return constructWebhookEvent(input.rawBody, signature)
  }

  if (input.provider === 'NOWPAYMENTS') {
    const isValid = await verifyNOWPaymentsIpnSignature(
      input.rawBody,
      input.req.headers.get('x-nowpayments-sig')
    )

    if (!isValid) {
      throw new ApiError(401, 'Invalid NOWPayments signature')
    }

    return JSON.parse(input.rawBody) as NOWPaymentsIpnPayload
  }

  return input.rawBody
}

export async function enforceWebhookIdempotency(input: {
  paymentId: string
  eventKey: string
  metadata?: string | null
  db?: DbClient
}) {
  const db = input.db ?? prisma
  const metadata = parsePaymentMetadata(input.metadata)
  const processed = new Set(metadata.processedWebhookKeys || [])

  if (processed.has(input.eventKey)) {
    return { duplicate: true, metadata, metadataJson: stringifyPaymentMetadata(metadata) }
  }

  processed.add(input.eventKey)
  metadata.processedWebhookKeys = [...processed]

  await db.payment.update({
    where: { id: input.paymentId },
    data: { metadata: stringifyPaymentMetadata(metadata) },
  })

  return {
    duplicate: false,
    metadata,
    metadataJson: stringifyPaymentMetadata(metadata),
  }
}

export function assertPaymentStatusTransition(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return
  const allowed = FORWARD_PAYMENT_TRANSITIONS[currentStatus] || []
  if (!allowed.includes(nextStatus)) {
    throw new ApiError(409, `Payment status cannot move from ${currentStatus} to ${nextStatus}`)
  }
}

export async function createImmutableFeeSnapshot(data: FeeSnapshotInput, db?: DbClient) {
  const service = new FeeCalculationService(db ?? prisma)
  return service.createFeeSnapshot({
    ...data,
    calculationData: JSON.parse(JSON.stringify(data.calculationData)),
  })
}

export async function createLedgerEntry(data: RevenueLedgerInput, db?: DbClient) {
  const service = new FeeCalculationService(db ?? prisma)
  return service.createRevenueLedger(data)
}

export async function reverseLedgerEntry(input: {
  originalLedgerId: string
  createdById?: string | null
  paymentId?: string | null
  refundRequestId?: string | null
  chargebackCaseId?: string | null
  reason?: string | null
}, db?: DbClient) {
  const service = new FeeCalculationService(db ?? prisma)
  return service.createRevenueReversalLedger(input)
}

export function requirePaymentOwnership(user: AuthUser, payment: PaymentRecord) {
  if (isAdmin(user)) return payment

  const ownsPayment =
    payment.userId === user.userId ||
    (!!user.companyId && payment.invoice?.subscription?.companyId === user.companyId) ||
    (!!user.companyId && payment.tradeOrder?.supplierCompanyId === user.companyId) ||
    (!!user.companyId && payment.sampleOrder?.supplierCompanyId === user.companyId)

  if (!ownsPayment) {
    throw new ApiError(403, 'Access denied')
  }

  return payment
}

export function sanitizePaymentForViewer(user: AuthUser, payment: PaymentRecord & Record<string, unknown>) {
  requirePaymentOwnership(user, payment)

  if (isAdmin(user) || payment.userId === user.userId) {
    return payment
  }

  const { metadata, ...rest } = payment
  return rest
}
