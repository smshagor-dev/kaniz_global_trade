import { createPaymentIntent } from '@/lib/payment/stripe'

export async function createTradePaymentCapture(params: {
  amount: number
  currencyCode: string
  metadata: Record<string, string>
}) {
  const currency = params.currencyCode.toLowerCase()

  if (params.amount > 0) {
    const intent = await createPaymentIntent(params.amount, currency, undefined, params.metadata)
    return {
      provider: 'STRIPE',
      status: intent.status,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      raw: intent,
    }
  }

  return {
    provider: 'MANUAL',
    status: 'requires_manual_review',
    paymentIntentId: null,
    clientSecret: null,
    raw: null,
  }
}
