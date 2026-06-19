import { getSettingsMap } from '@/lib/settings/system'

interface AamarPayInitiateResponse {
  result?: string | boolean
  payment_url?: string
  [key: string]: unknown
}

interface AamarPayTransactionResponse {
  mer_txnid?: string
  pg_txnid?: string
  pay_status?: string
  status_code?: string
  amount?: string
  currency?: string
  currency_merchant?: string
  card_type?: string
  bank_txn?: string
  [key: string]: unknown
}

interface AamarPayCustomer {
  name: string
  email: string
  phone: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
}

interface AamarPaySessionParams {
  amount: number
  currency: string
  transactionId: string
  description: string
  successUrl: string
  failUrl: string
  cancelUrl: string
  customer: AamarPayCustomer
  optA?: string
  optB?: string
  optC?: string
  optD?: string
}

async function getAamarPayConfig() {
  const settings = await getSettingsMap([
    'AAMARPAY_ENABLED',
    'AAMARPAY_STORE_ID',
    'AAMARPAY_SIGNATURE_KEY',
    'AAMARPAY_SANDBOX_MODE',
  ])

  if (settings.AAMARPAY_ENABLED === 'false') {
    throw new Error('aamarPay is currently disabled')
  }

  if (!settings.AAMARPAY_STORE_ID || !settings.AAMARPAY_SIGNATURE_KEY) {
    throw new Error('aamarPay credentials are not configured')
  }

  const sandboxMode = settings.AAMARPAY_SANDBOX_MODE !== 'false'
  return {
    initiateUrl: sandboxMode
      ? 'https://sandbox.aamarpay.com/jsonpost.php'
      : 'https://secure.aamarpay.com/jsonpost.php',
    searchUrl: sandboxMode
      ? 'https://sandbox.aamarpay.com/api/v1/trxcheck/request.php'
      : 'https://secure.aamarpay.com/api/v1/trxcheck/request.php',
    storeId: settings.AAMARPAY_STORE_ID,
    signatureKey: settings.AAMARPAY_SIGNATURE_KEY,
  }
}

export async function createAamarPaySession(params: AamarPaySessionParams) {
  const config = await getAamarPayConfig()
  const payload = {
    store_id: config.storeId,
    signature_key: config.signatureKey,
    tran_id: params.transactionId,
    amount: params.amount.toFixed(2),
    currency: params.currency.toUpperCase(),
    desc: params.description,
    cus_name: params.customer.name,
    cus_email: params.customer.email,
    cus_phone: params.customer.phone,
    cus_add1: params.customer.address1 || 'Dhaka',
    cus_add2: params.customer.address2 || params.customer.address1 || 'Dhaka',
    cus_city: params.customer.city || 'Dhaka',
    cus_state: params.customer.state || 'Dhaka',
    cus_postcode: params.customer.postcode || '1000',
    cus_country: params.customer.country || 'Bangladesh',
    success_url: params.successUrl,
    fail_url: params.failUrl,
    cancel_url: params.cancelUrl,
    type: 'json',
    opt_a: params.optA || '',
    opt_b: params.optB || '',
    opt_c: params.optC || '',
    opt_d: params.optD || '',
  }

  const response = await fetch(config.initiateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const result = (await response.json()) as AamarPayInitiateResponse
  const success = String(result.result).toLowerCase() === 'true'
  if (!response.ok || !success || !result.payment_url) {
    throw new Error('aamarPay session creation failed')
  }

  return {
    url: result.payment_url,
    raw: result,
  }
}

export async function searchAamarPayTransaction(transactionId: string) {
  const config = await getAamarPayConfig()
  const url = new URL(config.searchUrl)
  url.searchParams.set('request_id', transactionId)
  url.searchParams.set('store_id', config.storeId)
  url.searchParams.set('signature_key', config.signatureKey)
  url.searchParams.set('type', 'json')

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('aamarPay transaction search failed')
  }

  return response.json() as Promise<AamarPayTransactionResponse>
}

export function generateAamarPayTransactionId(prefix: string) {
  const normalizedPrefix = prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'KGT'
  const timePart = Date.now().toString(36).toUpperCase()
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${normalizedPrefix}${timePart}${randomPart}`.slice(0, 32)
}
