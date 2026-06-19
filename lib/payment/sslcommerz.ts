import { getSettingsMap } from '@/lib/settings/system'

type SSLCommerzStatus = 'SUCCESS' | 'FAILED'

interface SSLCommerzSessionResponse {
  status: SSLCommerzStatus
  failedreason?: string
  sessionkey?: string
  GatewayPageURL?: string
  redirectGatewayURL?: string
  [key: string]: unknown
}

interface SSLCommerzValidationResponse {
  status?: string
  tran_id?: string
  val_id?: string
  amount?: string
  currency_type?: string
  currency_amount?: string
  currency?: string
  bank_tran_id?: string
  card_type?: string
  [key: string]: unknown
}

interface SSLCommerzCustomer {
  name: string
  email: string
  phone?: string
  address1: string
  address2?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
}

interface SSLCommerzSessionParams {
  amount: number
  currency: string
  transactionId: string
  productName: string
  productCategory: string
  successUrl: string
  failUrl: string
  cancelUrl: string
  ipnUrl: string
  customer: SSLCommerzCustomer
  shipping?: {
    method?: string
    name?: string
    address1?: string
    address2?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
    numOfItems?: number
  }
  valueA?: string
  valueB?: string
  valueC?: string
  valueD?: string
}

async function getSSLCommerzConfig() {
  const settings = await getSettingsMap([
    'SSLCOMMERZ_ENABLED',
    'SSLCOMMERZ_STORE_ID',
    'SSLCOMMERZ_STORE_PASSWORD',
    'SSLCOMMERZ_SANDBOX_MODE',
  ])

  if (settings.SSLCOMMERZ_ENABLED === 'false') {
    throw new Error('SSLCommerz is currently disabled')
  }

  if (!settings.SSLCOMMERZ_STORE_ID || !settings.SSLCOMMERZ_STORE_PASSWORD) {
    throw new Error('SSLCommerz credentials are not configured')
  }

  const sandboxMode = settings.SSLCOMMERZ_SANDBOX_MODE !== 'false'
  const baseUrl = sandboxMode
    ? 'https://sandbox.sslcommerz.com'
    : 'https://securepay.sslcommerz.com'

  return {
    baseUrl,
    storeId: settings.SSLCOMMERZ_STORE_ID,
    storePassword: settings.SSLCOMMERZ_STORE_PASSWORD,
  }
}

export async function createSSLCommerzSession(params: SSLCommerzSessionParams) {
  const config = await getSSLCommerzConfig()
  const body = new URLSearchParams({
    store_id: config.storeId,
    store_passwd: config.storePassword,
    total_amount: params.amount.toFixed(2),
    currency: params.currency.toUpperCase(),
    tran_id: params.transactionId,
    product_name: params.productName,
    product_category: params.productCategory,
    product_profile: 'general',
    success_url: params.successUrl,
    fail_url: params.failUrl,
    cancel_url: params.cancelUrl,
    ipn_url: params.ipnUrl,
    cus_name: params.customer.name,
    cus_email: params.customer.email,
    cus_add1: params.customer.address1,
    cus_add2: params.customer.address2 || params.customer.address1,
    cus_city: params.customer.city || 'Dhaka',
    cus_state: params.customer.state || 'Dhaka',
    cus_postcode: params.customer.postcode || '1000',
    cus_country: params.customer.country || 'Bangladesh',
    cus_phone: params.customer.phone || '01700000000',
    shipping_method: params.shipping?.method || 'YES',
    ship_name: params.shipping?.name || params.customer.name,
    ship_add1: params.shipping?.address1 || params.customer.address1,
    ship_add2: params.shipping?.address2 || params.customer.address2 || params.customer.address1,
    ship_city: params.shipping?.city || params.customer.city || 'Dhaka',
    ship_state: params.shipping?.state || params.customer.state || 'Dhaka',
    ship_postcode: params.shipping?.postcode || params.customer.postcode || '1000',
    ship_country: params.shipping?.country || params.customer.country || 'Bangladesh',
    num_of_item: String(params.shipping?.numOfItems || 1),
    value_a: params.valueA || '',
    value_b: params.valueB || '',
    value_c: params.valueC || '',
    value_d: params.valueD || '',
  })

  const response = await fetch(`${config.baseUrl}/gwprocess/v4/api.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  })

  const result = (await response.json()) as SSLCommerzSessionResponse
  const gatewayUrl = result.GatewayPageURL || result.redirectGatewayURL

  if (!response.ok || result.status !== 'SUCCESS' || !gatewayUrl) {
    throw new Error(result.failedreason || 'SSLCommerz session creation failed')
  }

  return {
    url: gatewayUrl,
    sessionKey: result.sessionkey || null,
    raw: result,
  }
}

export async function validateSSLCommerzPayment(valId: string) {
  const config = await getSSLCommerzConfig()
  const search = new URLSearchParams({
    val_id: valId,
    store_id: config.storeId,
    store_passwd: config.storePassword,
    v: '1',
    format: 'json',
  })

  const response = await fetch(
    `${config.baseUrl}/validator/api/validationserverAPI.php?${search.toString()}`,
    {
      method: 'GET',
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error('SSLCommerz validation request failed')
  }

  return response.json() as Promise<SSLCommerzValidationResponse>
}

export function generateSSLCommerzTransactionId(prefix: string) {
  const normalizedPrefix = prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'KGT'
  const timePart = Date.now().toString(36).toUpperCase()
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${normalizedPrefix}${timePart}${randomPart}`.slice(0, 30)
}
