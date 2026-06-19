import prisma from '@/lib/db/prisma'

export interface SettingDefinition {
  key: string
  group: string
  label: string
  type: 'STRING' | 'BOOLEAN' | 'NUMBER' | 'PASSWORD'
  isSecret?: boolean
  description?: string
  fallback?: string
}

export const SYSTEM_SETTING_DEFINITIONS: SettingDefinition[] = [
  { key: 'STRIPE_ENABLED', group: 'PAYMENT', label: 'Stripe Enabled', type: 'BOOLEAN', description: 'Enable or disable Stripe checkout across supported payment flows.', fallback: process.env.STRIPE_ENABLED || 'true' },
  { key: 'STRIPE_SECRET_KEY', group: 'PAYMENT', label: 'Stripe Secret Key', type: 'PASSWORD', isSecret: true, description: 'Used for trade assurance funding, sample order payments, and Stripe checkout sessions.', fallback: process.env.STRIPE_SECRET_KEY || '' },
  { key: 'STRIPE_PUBLISHABLE_KEY', group: 'PAYMENT', label: 'Stripe Publishable Key', type: 'STRING', description: 'Frontend Stripe key for hosted checkout and embedded payment flows.', fallback: process.env.STRIPE_PUBLISHABLE_KEY || '' },
  { key: 'STRIPE_WEBHOOK_SECRET', group: 'PAYMENT', label: 'Stripe Webhook Secret', type: 'PASSWORD', isSecret: true, description: 'Verifies incoming webhook events from Stripe before payment state changes are applied.', fallback: process.env.STRIPE_WEBHOOK_SECRET || '' },
  { key: 'SSLCOMMERZ_ENABLED', group: 'PAYMENT', label: 'SSLCommerz Enabled', type: 'BOOLEAN', description: 'Enable or disable SSLCommerz checkout across supported payment flows.', fallback: process.env.SSLCOMMERZ_ENABLED || 'true' },
  { key: 'SSLCOMMERZ_STORE_ID', group: 'PAYMENT', label: 'SSLCommerz Store ID', type: 'STRING', description: 'Merchant store identifier used for SSLCommerz hosted checkout in Bangladesh.', fallback: process.env.SSLCOMMERZ_STORE_ID || '' },
  { key: 'SSLCOMMERZ_STORE_PASSWORD', group: 'PAYMENT', label: 'SSLCommerz Store Password', type: 'PASSWORD', isSecret: true, description: 'Store password paired with the SSLCommerz merchant account.', fallback: process.env.SSLCOMMERZ_STORE_PASSWORD || '' },
  { key: 'SSLCOMMERZ_SANDBOX_MODE', group: 'PAYMENT', label: 'SSLCommerz Sandbox Mode', type: 'BOOLEAN', description: 'Use SSLCommerz sandbox endpoints when true, or production endpoints when false.', fallback: process.env.SSLCOMMERZ_SANDBOX_MODE || 'true' },
  { key: 'AAMARPAY_ENABLED', group: 'PAYMENT', label: 'aamarPay Enabled', type: 'BOOLEAN', description: 'Enable or disable aamarPay checkout across supported payment flows.', fallback: process.env.AAMARPAY_ENABLED || 'true' },
  { key: 'AAMARPAY_STORE_ID', group: 'PAYMENT', label: 'aamarPay Store ID', type: 'STRING', description: 'Merchant store identifier used for aamarPay hosted checkout in Bangladesh.', fallback: process.env.AAMARPAY_STORE_ID || '' },
  { key: 'AAMARPAY_SIGNATURE_KEY', group: 'PAYMENT', label: 'aamarPay Signature Key', type: 'PASSWORD', isSecret: true, description: 'Signature key paired with the aamarPay merchant account.', fallback: process.env.AAMARPAY_SIGNATURE_KEY || '' },
  { key: 'AAMARPAY_SANDBOX_MODE', group: 'PAYMENT', label: 'aamarPay Sandbox Mode', type: 'BOOLEAN', description: 'Use aamarPay sandbox endpoints when true, or production endpoints when false.', fallback: process.env.AAMARPAY_SANDBOX_MODE || 'true' },
  { key: 'NOWPAYMENTS_ENABLED', group: 'PAYMENT', label: 'NOWPayments Enabled', type: 'BOOLEAN', description: 'Enable or disable NOWPayments crypto invoice checkout across supported payment flows.', fallback: process.env.NOWPAYMENTS_ENABLED || 'true' },
  { key: 'NOWPAYMENTS_API_KEY', group: 'PAYMENT', label: 'NOWPayments API Key', type: 'PASSWORD', isSecret: true, description: 'API key used to create crypto payment invoices with NOWPayments.', fallback: process.env.NOWPAYMENTS_API_KEY || '' },
  { key: 'NOWPAYMENTS_IPN_SECRET', group: 'PAYMENT', label: 'NOWPayments IPN Secret', type: 'PASSWORD', isSecret: true, description: 'Secret used to verify NOWPayments callback signatures.', fallback: process.env.NOWPAYMENTS_IPN_SECRET || '' },
  { key: 'NOWPAYMENTS_SANDBOX_MODE', group: 'PAYMENT', label: 'NOWPayments Sandbox Mode', type: 'BOOLEAN', description: 'Use NOWPayments sandbox endpoints when true, or production endpoints when false.', fallback: process.env.NOWPAYMENTS_SANDBOX_MODE || 'true' },
  { key: 'PAYPAL_ENABLED', group: 'PAYMENT', label: 'PayPal Enabled', type: 'BOOLEAN', description: 'Enable or disable PayPal wherever PayPal payment flows are supported.', fallback: process.env.PAYPAL_ENABLED || 'false' },
  { key: 'PAYPAL_CLIENT_ID', group: 'PAYMENT', label: 'PayPal Client ID', type: 'STRING', description: 'PayPal application client identifier for subscription and wallet integrations.', fallback: process.env.PAYPAL_CLIENT_ID || '' },
  { key: 'PAYPAL_CLIENT_SECRET', group: 'PAYMENT', label: 'PayPal Client Secret', type: 'PASSWORD', isSecret: true, description: 'Secret credential paired with the PayPal client ID.', fallback: process.env.PAYPAL_CLIENT_SECRET || '' },
  { key: 'PAYPAL_MODE', group: 'PAYMENT', label: 'PayPal Mode', type: 'STRING', description: 'Environment mode for PayPal requests. Typical values are sandbox or live.', fallback: process.env.PAYPAL_MODE || 'sandbox' },
  { key: 'DHL_TRACKING_API_KEY', group: 'SHIPPING', label: 'DHL Tracking API Key', type: 'PASSWORD', isSecret: true, description: 'Credential for DHL shipment lookup and tracking sync.', fallback: process.env.DHL_TRACKING_API_KEY || '' },
  { key: 'FEDEX_API_KEY', group: 'SHIPPING', label: 'FedEx API Key', type: 'PASSWORD', isSecret: true, description: 'FedEx API key used for rate, tracking, and shipment service integrations.', fallback: process.env.FEDEX_API_KEY || '' },
  { key: 'FEDEX_API_SECRET', group: 'SHIPPING', label: 'FedEx API Secret', type: 'PASSWORD', isSecret: true, description: 'FedEx API secret paired with the configured API key.', fallback: process.env.FEDEX_API_SECRET || '' },
  { key: 'UPS_CLIENT_ID', group: 'SHIPPING', label: 'UPS Client ID', type: 'STRING', description: 'UPS OAuth client ID for shipment and tracking requests.', fallback: process.env.UPS_CLIENT_ID || '' },
  { key: 'UPS_CLIENT_SECRET', group: 'SHIPPING', label: 'UPS Client Secret', type: 'PASSWORD', isSecret: true, description: 'UPS OAuth client secret used to fetch access tokens.', fallback: process.env.UPS_CLIENT_SECRET || '' },
  { key: 'MAERSK_API_KEY', group: 'SHIPPING', label: 'Maersk API Key', type: 'PASSWORD', isSecret: true, description: 'Used for ocean freight booking and container milestone integrations.', fallback: process.env.MAERSK_API_KEY || '' },
  { key: 'DEFAULT_FINANCING_PARTNER', group: 'PARTNERS', label: 'Default Financing Partner', type: 'STRING', description: 'Primary lender or fintech partner surfaced in supplier financing workflows.', fallback: process.env.DEFAULT_FINANCING_PARTNER || 'Global Trade Capital' },
  { key: 'DEFAULT_INSURANCE_PROVIDER', group: 'PARTNERS', label: 'Default Insurance Provider', type: 'STRING', description: 'Default insurance carrier displayed for cargo and trade insurance offers.', fallback: process.env.DEFAULT_INSURANCE_PROVIDER || 'Allianz Trade' },
  { key: 'SMTP_HOST', group: 'EMAIL', label: 'SMTP Host', type: 'STRING', description: 'Mail server hostname used for transactional emails.', fallback: process.env.SMTP_HOST || '' },
  { key: 'SMTP_PORT', group: 'EMAIL', label: 'SMTP Port', type: 'NUMBER', description: 'SMTP server port. Common values are 587 for TLS or 465 for SSL.', fallback: process.env.SMTP_PORT || '587' },
  { key: 'SMTP_SECURE', group: 'EMAIL', label: 'SMTP Secure', type: 'BOOLEAN', description: 'Enable secure SMTP transport when the provider requires SSL/TLS from connection start.', fallback: process.env.SMTP_SECURE || 'false' },
  { key: 'SMTP_USER', group: 'EMAIL', label: 'SMTP User', type: 'STRING', description: 'SMTP username used by the platform mailer.', fallback: process.env.SMTP_USER || '' },
  { key: 'SMTP_PASS', group: 'EMAIL', label: 'SMTP Password', type: 'PASSWORD', isSecret: true, description: 'Password or app token used for SMTP authentication.', fallback: process.env.SMTP_PASS || '' },
  { key: 'SMTP_FROM', group: 'EMAIL', label: 'SMTP From', type: 'STRING', description: 'Default sender identity for outgoing emails.', fallback: process.env.SMTP_FROM || 'Kaniz Global Trade <noreply@kanizglobaltrade.com>' },
  { key: 'S3_ACCESS_KEY', group: 'STORAGE', label: 'S3 Access Key', type: 'STRING', description: 'Access key for Cloudflare R2 or S3-compatible object storage.', fallback: process.env.S3_ACCESS_KEY || '' },
  { key: 'S3_SECRET_KEY', group: 'STORAGE', label: 'S3 Secret Key', type: 'PASSWORD', isSecret: true, description: 'Secret key paired with the configured object storage access key.', fallback: process.env.S3_SECRET_KEY || '' },
  { key: 'S3_BUCKET', group: 'STORAGE', label: 'S3 Bucket', type: 'STRING', description: 'Target bucket used for product media, documents, and uploads.', fallback: process.env.S3_BUCKET || '' },
  { key: 'S3_ENDPOINT', group: 'STORAGE', label: 'S3 Endpoint', type: 'STRING', description: 'Custom endpoint URL for R2 or any S3-compatible provider.', fallback: process.env.S3_ENDPOINT || '' },
  { key: 'S3_REGION', group: 'STORAGE', label: 'S3 Region', type: 'STRING', description: 'Storage region. For Cloudflare R2 this commonly stays as auto.', fallback: process.env.S3_REGION || 'auto' },
  { key: 'NEXT_PUBLIC_CDN_URL', group: 'STORAGE', label: 'CDN URL', type: 'STRING', description: 'Optional public CDN base URL for serving uploaded assets.', fallback: process.env.NEXT_PUBLIC_CDN_URL || '' },
]

export const SETTINGS_GROUPS = [
  { key: 'PAYMENT', label: 'Payment Gateways' },
  { key: 'SHIPPING', label: 'Shipping & Tracking' },
  { key: 'PARTNERS', label: 'Finance & Insurance Partners' },
  { key: 'EMAIL', label: 'SMTP Email' },
  { key: 'STORAGE', label: 'Cloudflare R2 / AWS S3' },
] as const

const definitionMap = new Map(SYSTEM_SETTING_DEFINITIONS.map((item) => [item.key, item]))

export async function ensureSystemSettingsSeeded() {
  await Promise.all(
    SYSTEM_SETTING_DEFINITIONS.map((definition) =>
      prisma.systemSetting.upsert({
        where: { key: definition.key },
        create: {
          key: definition.key,
          value: definition.fallback || '',
          type: definition.type,
          group: definition.group,
          label: definition.label,
          description: definition.description,
          isSecret: definition.isSecret || false,
        },
        update: {
          group: definition.group,
          label: definition.label,
          type: definition.type,
          description: definition.description,
          isSecret: definition.isSecret || false,
        },
      })
    )
  )
}

export async function getSettingsByGroup(group: string) {
  await ensureSystemSettingsSeeded()
  return prisma.systemSetting.findMany({
    where: { group },
    orderBy: { key: 'asc' },
  })
}

export async function getSettingValue(key: string): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } })
  if (setting?.value != null && setting.value !== '') return setting.value
  return definitionMap.get(key)?.fallback || ''
}

export async function getSettingsMap(keys: string[]) {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  })
  const map = new Map(rows.map((row) => [row.key, row.value || '']))
  return keys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = map.get(key) || definitionMap.get(key)?.fallback || ''
    return acc
  }, {})
}

export async function updateSettings(group: string, values: Array<{ key: string; value: string; updatedBy?: string }>) {
  await ensureSystemSettingsSeeded()
  return prisma.$transaction(
    values.map((item) =>
      prisma.systemSetting.update({
        where: { key: item.key },
        data: {
          value: item.value,
          updatedBy: item.updatedBy,
          group,
        },
      })
    )
  )
}
