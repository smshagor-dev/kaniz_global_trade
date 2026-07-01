export function resolveStripeMode(stripeMode?: string | null, stripeSecretKey?: string | null) {
  const normalizedMode = String(stripeMode || '').trim().toLowerCase()
  if (normalizedMode === 'sandbox' || normalizedMode === 'test') return 'sandbox'
  if (normalizedMode === 'live') return 'live'

  const secretKey = String(stripeSecretKey || '').trim().toLowerCase()
  if (secretKey.startsWith('sk_test_') || secretKey.startsWith('rk_test_')) return 'sandbox'

  return 'live'
}
