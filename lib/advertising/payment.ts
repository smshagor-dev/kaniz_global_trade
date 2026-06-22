import prisma from '@/lib/db/prisma'
import { getAdvertisingSettings } from '@/lib/advertising/settings'
import { getSettingsMap } from '@/lib/settings/system'

export const AD_PAYMENT_METHODS = ['STRIPE', 'SSLCOMMERZ', 'AAMARPAY', 'NOWPAYMENTS'] as const

export type AdPaymentMethod = typeof AD_PAYMENT_METHODS[number]

export type AdPaymentMethodSummary = {
  key: AdPaymentMethod
  label: string
  enabled: boolean
  mode: string
}

type AdPaymentMetadata = {
  kind?: string
  adCampaignId?: string
  companyId?: string
  source?: string
}

function parseMetadata(value: string | null | undefined): AdPaymentMetadata {
  if (!value) return {}

  try {
    return JSON.parse(value) as AdPaymentMetadata
  } catch {
    return {}
  }
}

export async function getAdPaymentMethods(): Promise<AdPaymentMethodSummary[]> {
  const settings = await getSettingsMap([
    'STRIPE_ENABLED',
    'SSLCOMMERZ_ENABLED',
    'SSLCOMMERZ_SANDBOX_MODE',
    'AAMARPAY_ENABLED',
    'AAMARPAY_SANDBOX_MODE',
    'NOWPAYMENTS_ENABLED',
    'NOWPAYMENTS_SANDBOX_MODE',
  ])

  return [
    { key: 'STRIPE', label: 'Stripe', enabled: settings.STRIPE_ENABLED === 'true', mode: 'live' },
    { key: 'SSLCOMMERZ', label: 'SSLCommerz', enabled: settings.SSLCOMMERZ_ENABLED === 'true', mode: settings.SSLCOMMERZ_SANDBOX_MODE === 'true' ? 'sandbox' : 'live' },
    { key: 'AAMARPAY', label: 'aamarPay', enabled: settings.AAMARPAY_ENABLED === 'true', mode: settings.AAMARPAY_SANDBOX_MODE === 'true' ? 'sandbox' : 'live' },
    { key: 'NOWPAYMENTS', label: 'NOWPayments', enabled: settings.NOWPAYMENTS_ENABLED === 'true', mode: settings.NOWPAYMENTS_SANDBOX_MODE === 'true' ? 'sandbox' : 'live' },
  ]
}

export async function assertAdPaymentMethodEnabled(method: AdPaymentMethod) {
  const methods = await getAdPaymentMethods()
  const selected = methods.find((item) => item.key === method)
  if (!selected?.enabled) {
    throw new Error(`${method} is currently unavailable`)
  }
}

export function buildAdPaymentMetadata(campaignId: string, companyId: string) {
  return {
    kind: 'AD_CAMPAIGN',
    adCampaignId: campaignId,
    companyId,
    source: 'SUPPLIER_DASHBOARD',
  }
}

export function getAdPaymentReturnUrl(status: 'success' | 'failed' | 'cancelled', gateway: string, campaignId?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  const url = new URL('/payment-return/ads', baseUrl)
  url.searchParams.set('payment', status)
  url.searchParams.set('gateway', gateway.toLowerCase())
  if (campaignId) url.searchParams.set('campaignId', campaignId)
  return url.toString()
}

export async function finalizeAdCampaignPayment(
  paymentId: string,
  payload: Record<string, unknown>,
  gateway: string
) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) return null

  const metadata = parseMetadata(payment.metadata)
  if (metadata.kind !== 'AD_CAMPAIGN' || !metadata.adCampaignId) return null

  const advertisingSettings = await getAdvertisingSettings()

  return prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        failureReason: null,
        metadata: JSON.stringify({
          ...payload,
          ...metadata,
          captureStatus: 'paid',
          gateway,
        }),
      },
    })

    const updatedCampaign = await tx.adCampaign.update({
      where: { id: metadata.adCampaignId! },
      data: {
        status: advertisingSettings.autoApprove ? 'ACTIVE' : 'PENDING_APPROVAL',
        approvedAt: advertisingSettings.autoApprove ? new Date() : null,
        approvedBy: null,
        rejectionReason: null,
      },
    })

    return { payment: updatedPayment, campaign: updatedCampaign }
  })
}

export async function failAdCampaignPayment(
  paymentId: string,
  reason: string,
  payload: Record<string, unknown>,
  status: 'FAILED' | 'CANCELLED' = 'FAILED'
) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) return null

  const metadata = parseMetadata(payment.metadata)

  return prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status,
        failureReason: reason,
        metadata: JSON.stringify({
          ...payload,
          ...metadata,
          callbackStatus: status,
        }),
      },
    })

    const updatedCampaign = metadata.adCampaignId
      ? await tx.adCampaign.update({
          where: { id: metadata.adCampaignId },
          data: {
            status: 'DRAFT',
            rejectionReason: reason,
          },
        })
      : null

    return { payment: updatedPayment, campaign: updatedCampaign }
  })
}

export async function getCampaignPaymentSummary(campaignIds: string[]) {
  if (!campaignIds.length) return new Map<string, { status: string; method: string; failureReason: string | null; updatedAt: string }>()

  const payments = await prisma.payment.findMany({
    where: {
      metadata: {
        contains: '"kind":"AD_CAMPAIGN"',
      },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      status: true,
      method: true,
      failureReason: true,
      metadata: true,
      updatedAt: true,
    },
  })

  const wanted = new Set(campaignIds)
  const summary = new Map<string, { status: string; method: string; failureReason: string | null; updatedAt: string }>()

  for (const payment of payments) {
    const metadata = parseMetadata(payment.metadata)
    if (!metadata.adCampaignId || !wanted.has(metadata.adCampaignId) || summary.has(metadata.adCampaignId)) {
      continue
    }

    summary.set(metadata.adCampaignId, {
      status: payment.status,
      method: payment.method,
      failureReason: payment.failureReason,
      updatedAt: payment.updatedAt.toISOString(),
    })
  }

  return summary
}
