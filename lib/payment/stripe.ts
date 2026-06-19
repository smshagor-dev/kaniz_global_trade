import Stripe from 'stripe'
import { getSettingsMap } from '@/lib/settings/system'

async function getStripeClient() {
  const settings = await getSettingsMap([
    'STRIPE_ENABLED',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ])

  if (settings.STRIPE_ENABLED === 'false') {
    throw new Error('Stripe is currently disabled')
  }

  return {
    stripe: new Stripe(settings.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
      typescript: true,
    }),
    webhookSecret: settings.STRIPE_WEBHOOK_SECRET,
  }
}

export async function createStripeCustomer(email: string, name: string): Promise<string> {
  const { stripe } = await getStripeClient()
  const customer = await stripe.customers.create({ email, name })
  return customer.id
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string> = {}
): Promise<string> {
  const { stripe } = await getStripeClient()
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    allow_promotion_codes: true,
  })

  return session.url!
}

export async function createOneTimeCheckoutSession(params: {
  customerId?: string
  successUrl: string
  cancelUrl: string
  lineItems: Array<{
    name: string
    description?: string
    amount: number
    currency: string
    quantity?: number
  }>
  metadata?: Record<string, string>
}): Promise<{ url: string; id: string }> {
  const { stripe } = await getStripeClient()
  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
    line_items: params.lineItems.map((item) => ({
      quantity: item.quantity || 1,
      price_data: {
        currency: item.currency.toLowerCase(),
        unit_amount: Math.round(item.amount * 100),
        product_data: {
          name: item.name,
          description: item.description,
        },
      },
    })),
  })

  return { url: session.url!, id: session.id }
}

export async function createPaymentIntent(
  amount: number,
  currency = 'usd',
  customerId?: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
  const { stripe } = await getStripeClient()
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    customer: customerId,
    metadata,
    automatic_payment_methods: { enabled: true },
  })
}

export async function cancelSubscription(stripeSubId: string): Promise<void> {
  const { stripe } = await getStripeClient()
  await stripe.subscriptions.cancel(stripeSubId)
}

export async function getSubscription(stripeSubId: string): Promise<Stripe.Subscription> {
  const { stripe } = await getStripeClient()
  return stripe.subscriptions.retrieve(stripeSubId)
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const { stripe, webhookSecret } = await getStripeClient()
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
  )
}

export async function createInvoice(
  customerId: string,
  items: { description: string; amount: number; currency: string }[]
): Promise<Stripe.Invoice> {
  const { stripe } = await getStripeClient()
  for (const item of items) {
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(item.amount * 100),
      currency: item.currency,
      description: item.description,
    })
  }

  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
  })

  return stripe.invoices.finalizeInvoice(invoice.id)
}
