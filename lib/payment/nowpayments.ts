import crypto from 'crypto'
import { getSettingsMap } from '@/lib/settings/system'

interface NOWPaymentsInvoiceResponse {
  id?: string | number
  invoice_url?: string
  order_id?: string
  [key: string]: unknown
}

export interface NOWPaymentsIpnPayload {
  payment_id?: string | number
  payment_status?: string
  order_id?: string
  order_description?: string
  pay_currency?: string
  price_amount?: number | string
  price_currency?: string
  actually_paid?: number | string
  pay_amount?: number | string
  [key: string]: unknown
}

interface NOWPaymentsInvoiceParams {
  amount: number
  currency: string
  orderId: string
  description: string
  successUrl: string
  cancelUrl: string
  ipnCallbackUrl: string
}

async function getNOWPaymentsConfig() {
  const settings = await getSettingsMap([
    'NOWPAYMENTS_ENABLED',
    'NOWPAYMENTS_API_KEY',
    'NOWPAYMENTS_IPN_SECRET',
    'NOWPAYMENTS_SANDBOX_MODE',
  ])

  if (settings.NOWPAYMENTS_ENABLED === 'false') {
    throw new Error('NOWPayments is currently disabled')
  }

  if (!settings.NOWPAYMENTS_API_KEY || !settings.NOWPAYMENTS_IPN_SECRET) {
    throw new Error('NOWPayments credentials are not configured')
  }

  const sandboxMode = settings.NOWPAYMENTS_SANDBOX_MODE === 'true'

  return {
    apiKey: settings.NOWPAYMENTS_API_KEY,
    ipnSecret: settings.NOWPAYMENTS_IPN_SECRET,
    baseUrl: sandboxMode ? 'https://api-sandbox.nowpayments.io/v1' : 'https://api.nowpayments.io/v1',
  }
}

export async function createNOWPaymentsInvoice(params: NOWPaymentsInvoiceParams) {
  const config = await getNOWPaymentsConfig()

  const response = await fetch(`${config.baseUrl}/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
    },
    body: JSON.stringify({
      price_amount: Number(params.amount.toFixed(2)),
      price_currency: params.currency.toLowerCase(),
      order_id: params.orderId,
      order_description: params.description,
      ipn_callback_url: params.ipnCallbackUrl,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    }),
    cache: 'no-store',
  })

  const result = (await response.json()) as NOWPaymentsInvoiceResponse
  if (!response.ok || !result.invoice_url) {
    throw new Error('NOWPayments invoice creation failed')
  }

  return {
    url: result.invoice_url,
    invoiceId: result.id ? String(result.id) : null,
    raw: result,
  }
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }

  return value
}

export async function verifyNOWPaymentsIpnSignature(rawBody: string, signature: string | null) {
  if (!signature) return false
  const config = await getNOWPaymentsConfig()
  const payload = JSON.parse(rawBody) as Record<string, unknown>
  const sortedPayload = sortObject(payload)
  const expected = crypto
    .createHmac('sha512', config.ipnSecret)
    .update(JSON.stringify(sortedPayload))
    .digest('hex')

  return expected === signature
}

export function generateNOWPaymentsOrderId(prefix: string) {
  const normalizedPrefix = prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'KGTNOW'
  const timePart = Date.now().toString(36).toUpperCase()
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${normalizedPrefix}${timePart}${randomPart}`.slice(0, 40)
}
