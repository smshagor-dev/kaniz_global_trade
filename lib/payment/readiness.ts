import { getSettingsMap } from '@/lib/settings/system'
import { resolveStripeMode } from '@/lib/payment/mode'
import { resolveAppUrl } from '@/lib/payment/urls'

export type PaymentReadinessLevel = 'ok' | 'warning' | 'error'

export type PaymentReadinessCheck = {
  level: PaymentReadinessLevel
  message: string
}

export type PaymentGatewayReadiness = {
  gateway: string
  enabled: boolean
  mode: string
  status: PaymentReadinessLevel
  checks: PaymentReadinessCheck[]
}

export type PaymentReadinessReport = {
  appUrl: string | null
  overallStatus: PaymentReadinessLevel
  checks: PaymentReadinessCheck[]
  gateways: PaymentGatewayReadiness[]
}

function hasValue(value: string | null | undefined) {
  return String(value || '').trim().length > 0
}

function worstLevel(levels: PaymentReadinessLevel[]) {
  if (levels.includes('error')) return 'error'
  if (levels.includes('warning')) return 'warning'
  return 'ok'
}

function pushCheck(target: PaymentReadinessCheck[], condition: boolean, okMessage: string, errorMessage: string) {
  target.push({
    level: condition ? 'ok' : 'error',
    message: condition ? okMessage : errorMessage,
  })
}

function looksLiveDomain(url: string) {
  const hostname = new URL(url).hostname.toLowerCase()
  return !['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname) && !hostname.endsWith('.local')
}

function evaluateStripe(settings: Record<string, string>) {
  const enabled = settings.STRIPE_ENABLED === 'true'
  const mode = resolveStripeMode(settings.STRIPE_MODE, settings.STRIPE_SECRET_KEY)
  const checks: PaymentReadinessCheck[] = []

  pushCheck(checks, hasValue(settings.STRIPE_SECRET_KEY), 'Secret key saved', 'Stripe secret key is missing')
  pushCheck(checks, hasValue(settings.STRIPE_PUBLISHABLE_KEY), 'Publishable key saved', 'Stripe publishable key is missing')
  pushCheck(checks, hasValue(settings.STRIPE_WEBHOOK_SECRET), 'Webhook secret saved', 'Stripe webhook secret is missing')

  if (enabled) {
    if (mode === 'live') {
      checks.push({
        level: settings.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'ok' : 'error',
        message: settings.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'Live secret key matches live mode' : 'Stripe live mode requires an `sk_live_` secret key',
      })
      checks.push({
        level: settings.STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_') ? 'ok' : 'error',
        message: settings.STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_') ? 'Live publishable key matches live mode' : 'Stripe live mode requires a `pk_live_` publishable key',
      })
    } else {
      checks.push({
        level: settings.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'ok' : 'warning',
        message: settings.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'Sandbox secret key matches sandbox mode' : 'Stripe sandbox mode usually uses an `sk_test_` secret key',
      })
    }
  }

  return {
    gateway: 'Stripe',
    enabled,
    mode,
    status: worstLevel(checks.map((check) => check.level)),
    checks,
  } satisfies PaymentGatewayReadiness
}

function evaluateBooleanModeGateway(input: {
  gateway: string
  enabled: boolean
  sandbox: boolean
  required: Array<{ key: string; label: string }>
  settings: Record<string, string>
}) {
  const checks: PaymentReadinessCheck[] = []

  for (const item of input.required) {
    pushCheck(
      checks,
      hasValue(input.settings[item.key]),
      `${item.label} saved`,
      `${item.label} is missing`
    )
  }

  checks.push({
    level: input.sandbox ? 'warning' : 'ok',
    message: input.sandbox ? `${input.gateway} is still in sandbox mode` : `${input.gateway} is set to live mode`,
  })

  return {
    gateway: input.gateway,
    enabled: input.enabled,
    mode: input.sandbox ? 'sandbox' : 'live',
    status: worstLevel(checks.map((check) => check.level)),
    checks,
  } satisfies PaymentGatewayReadiness
}

export async function getPaymentReadinessReport(): Promise<PaymentReadinessReport> {
  const settings = await getSettingsMap([
    'STRIPE_ENABLED',
    'STRIPE_MODE',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SSLCOMMERZ_ENABLED',
    'SSLCOMMERZ_STORE_ID',
    'SSLCOMMERZ_STORE_PASSWORD',
    'SSLCOMMERZ_SANDBOX_MODE',
    'AAMARPAY_ENABLED',
    'AAMARPAY_STORE_ID',
    'AAMARPAY_SIGNATURE_KEY',
    'AAMARPAY_SANDBOX_MODE',
    'NOWPAYMENTS_ENABLED',
    'NOWPAYMENTS_API_KEY',
    'NOWPAYMENTS_IPN_SECRET',
    'NOWPAYMENTS_SANDBOX_MODE',
    'PAYPAL_ENABLED',
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'PAYPAL_MODE',
  ])

  const checks: PaymentReadinessCheck[] = []
  let appUrl: string | null = null

  try {
    appUrl = resolveAppUrl()
    checks.push({ level: 'ok', message: `App URL configured as ${appUrl}` })
    checks.push({
      level: looksLiveDomain(appUrl) ? 'ok' : 'warning',
      message: looksLiveDomain(appUrl)
        ? 'App URL points to a non-localhost domain'
        : 'App URL still points to localhost or a local network alias',
    })
  } catch (error) {
    checks.push({
      level: 'error',
      message: error instanceof Error ? error.message : 'NEXT_PUBLIC_APP_URL is invalid',
    })
  }

  const gateways: PaymentGatewayReadiness[] = [
    evaluateStripe(settings),
    evaluateBooleanModeGateway({
      gateway: 'SSLCommerz',
      enabled: settings.SSLCOMMERZ_ENABLED === 'true',
      sandbox: settings.SSLCOMMERZ_SANDBOX_MODE === 'true',
      required: [
        { key: 'SSLCOMMERZ_STORE_ID', label: 'Store ID' },
        { key: 'SSLCOMMERZ_STORE_PASSWORD', label: 'Store password' },
      ],
      settings,
    }),
    evaluateBooleanModeGateway({
      gateway: 'aamarPay',
      enabled: settings.AAMARPAY_ENABLED === 'true',
      sandbox: settings.AAMARPAY_SANDBOX_MODE === 'true',
      required: [
        { key: 'AAMARPAY_STORE_ID', label: 'Store ID' },
        { key: 'AAMARPAY_SIGNATURE_KEY', label: 'Signature key' },
      ],
      settings,
    }),
    evaluateBooleanModeGateway({
      gateway: 'NOWPayments',
      enabled: settings.NOWPAYMENTS_ENABLED === 'true',
      sandbox: settings.NOWPAYMENTS_SANDBOX_MODE === 'true',
      required: [
        { key: 'NOWPAYMENTS_API_KEY', label: 'API key' },
        { key: 'NOWPAYMENTS_IPN_SECRET', label: 'IPN secret' },
      ],
      settings,
    }),
    {
      gateway: 'PayPal',
      enabled: settings.PAYPAL_ENABLED === 'true',
      mode: settings.PAYPAL_MODE || 'sandbox',
      status: settings.PAYPAL_ENABLED === 'true' ? 'warning' : 'ok',
      checks: [
        {
          level: hasValue(settings.PAYPAL_CLIENT_ID) ? 'ok' : 'error',
          message: hasValue(settings.PAYPAL_CLIENT_ID) ? 'Client ID saved' : 'PayPal client ID is missing',
        },
        {
          level: hasValue(settings.PAYPAL_CLIENT_SECRET) ? 'ok' : 'error',
          message: hasValue(settings.PAYPAL_CLIENT_SECRET) ? 'Client secret saved' : 'PayPal client secret is missing',
        },
        {
          level: settings.PAYPAL_ENABLED === 'true' ? 'warning' : 'ok',
          message: settings.PAYPAL_ENABLED === 'true'
            ? 'PayPal credentials exist, but marketplace checkout routes do not currently use PayPal'
            : 'PayPal is disabled',
        },
      ],
    },
  ]

  return {
    appUrl,
    overallStatus: worstLevel([
      ...checks.map((check) => check.level),
      ...gateways.filter((gateway) => gateway.enabled).map((gateway) => gateway.status),
    ]),
    checks,
    gateways,
  }
}
