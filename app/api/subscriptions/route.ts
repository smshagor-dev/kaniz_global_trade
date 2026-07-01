import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError } from '@/lib/utils/api'
import { createCheckoutSession, createStripeCustomer } from '@/lib/payment/stripe'
import { createNotification } from '@/server/services/notification'
import { createSSLCommerzSession, generateSSLCommerzTransactionId } from '@/lib/payment/sslcommerz'
import { createAamarPaySession, generateAamarPayTransactionId } from '@/lib/payment/aamarpay'
import { createNOWPaymentsInvoice, generateNOWPaymentsOrderId } from '@/lib/payment/nowpayments'
import { getPlanPrice, isFreePlan } from '@/lib/packages'

function getPackagePaymentReturnUrl(status: 'success' | 'failed' | 'cancelled', gateway: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  const url = new URL('/payment-return/packages', baseUrl)
  url.searchParams.set('payment', status)
  url.searchParams.set('gateway', gateway.toLowerCase())
  return url.toString()
}

const subscribeSchema = z.object({
  companyId: z.string(),
  planId: z.string(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  paymentMethod: z.enum(['STRIPE', 'SSLCOMMERZ', 'AAMARPAY', 'NOWPAYMENTS', 'PAYPAL', 'MANUAL']).default('STRIPE'),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const companyId = new URL(req.url).searchParams.get('companyId')
    if (!companyId) throw new ApiError(400, 'companyId required')

    await requireCompanyAccess(req, companyId)

    const subscription = await prisma.subscription.findUnique({
      where: { companyId },
      include: {
        plan: true,
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })

    return successResponse(subscription)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const data = subscribeSchema.parse(await req.json())

    await requireCompanyAccess(req, data.companyId)

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.planId } })
    if (!plan || !plan.isActive) throw new ApiError(404, 'Plan not found')

    const user = await prisma.user.findUnique({ where: { id: authUser.userId } })
    if (!user) throw new ApiError(404, 'User not found')

    if (isFreePlan(plan, data.billingCycle)) {
      const now = new Date()
      const trialEndsAt = plan.trialDays > 0
        ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
        : null
      const currentPeriodEnd = trialEndsAt || new Date(now.getFullYear() + 10, 11, 31)

      const subscription = await prisma.subscription.upsert({
        where: { companyId: data.companyId },
        create: {
          companyId: data.companyId,
          planId: data.planId,
          status: trialEndsAt ? 'TRIAL' : 'ACTIVE',
          billingCycle: data.billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd,
          trialEndsAt,
        },
        update: {
          planId: data.planId,
          status: trialEndsAt ? 'TRIAL' : 'ACTIVE',
          billingCycle: data.billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd,
          trialEndsAt,
          cancelledAt: null,
        },
      })

      await createNotification({
        userId: authUser.userId,
        type: 'PAYMENT_SUCCESS',
        title: 'Package activated',
        message: `${plan.name} package is now active for your supplier account.`,
        data: { planId: plan.id, subscriptionId: subscription.id },
      })

      return successResponse({ subscription }, 'Free package activated successfully')
    }

    if (data.paymentMethod === 'STRIPE') {
      let subscription = await prisma.subscription.findUnique({ where: { companyId: data.companyId } })

      let stripeCustomerId = subscription?.stripeCustomerId
      if (!stripeCustomerId) {
        stripeCustomerId = await createStripeCustomer(user.email, `${user.firstName} ${user.lastName}`)
      }

      const priceId = data.billingCycle === 'YEARLY' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly
      if (!priceId) throw new ApiError(400, 'Stripe price not configured for this plan')

      const successUrl = getPackagePaymentReturnUrl('success', 'stripe')
      const cancelUrl = getPackagePaymentReturnUrl('cancelled', 'stripe')

      const checkoutUrl = await createCheckoutSession(
        stripeCustomerId,
        priceId,
        successUrl,
        cancelUrl,
        { companyId: data.companyId, planId: data.planId, billingCycle: data.billingCycle }
      )

      return successResponse({ checkoutUrl }, 'Stripe checkout session created')
    }

    if (data.paymentMethod === 'SSLCOMMERZ') {
      const price = getPlanPrice(plan, data.billingCycle)
      const transactionId = generateSSLCommerzTransactionId('KGTSUB')
      const payment = await prisma.payment.create({
        data: {
          userId: authUser.userId,
          amount: price,
          currency: 'USD',
          method: 'SSLCOMMERZ',
          status: 'PENDING',
          transactionId,
          metadata: JSON.stringify({
            kind: 'SUBSCRIPTION',
            companyId: data.companyId,
            planId: data.planId,
            billingCycle: data.billingCycle,
          }),
        },
      })

      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/sslcommerz/callback`
      const checkout = await createSSLCommerzSession({
        amount: price,
        currency: 'USD',
        transactionId,
        productName: `${plan.name} ${data.billingCycle} Subscription`,
        productCategory: 'subscription',
        successUrl: callbackUrl,
        failUrl: callbackUrl,
        cancelUrl: callbackUrl,
        ipnUrl: callbackUrl,
        customer: {
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          phone: user.phone || undefined,
          address1: 'Dhaka, Bangladesh',
        },
        shipping: {
          method: 'NO',
          name: `${user.firstName} ${user.lastName}`.trim(),
          address1: 'Dhaka, Bangladesh',
          numOfItems: 1,
        },
        valueA: payment.id,
        valueB: data.companyId,
        valueC: 'SUBSCRIPTION',
        valueD: data.planId,
      })

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: JSON.stringify({
            kind: 'SUBSCRIPTION',
            companyId: data.companyId,
            planId: data.planId,
            billingCycle: data.billingCycle,
            sessionKey: checkout.sessionKey,
          }),
        },
      })

      return successResponse({ checkoutUrl: checkout.url }, 'SSLCommerz checkout session created')
    }

    if (data.paymentMethod === 'AAMARPAY') {
      const price = getPlanPrice(plan, data.billingCycle)
      const transactionId = generateAamarPayTransactionId('KGTSUB')
      await prisma.payment.create({
        data: {
          userId: authUser.userId,
          amount: price,
          currency: 'USD',
          method: 'AAMARPAY',
          status: 'PENDING',
          transactionId,
          metadata: JSON.stringify({
            kind: 'SUBSCRIPTION',
            companyId: data.companyId,
            planId: data.planId,
            billingCycle: data.billingCycle,
          }),
        },
      })

      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/aamarpay/callback`
      const checkout = await createAamarPaySession({
        amount: price,
        currency: 'USD',
        transactionId,
        description: `${plan.name} ${data.billingCycle} subscription`,
        successUrl: callbackUrl,
        failUrl: callbackUrl,
        cancelUrl: callbackUrl,
        customer: {
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          phone: user.phone || '01700000000',
          address1: 'Dhaka, Bangladesh',
          city: 'Dhaka',
          state: 'Dhaka',
          postcode: '1000',
          country: 'Bangladesh',
        },
        optA: data.companyId,
        optB: data.planId,
        optC: data.billingCycle,
        optD: 'SUBSCRIPTION',
      })

      return successResponse({ checkoutUrl: checkout.url }, 'aamarPay checkout session created')
    }

    if (data.paymentMethod === 'NOWPAYMENTS') {
      const price = getPlanPrice(plan, data.billingCycle)
      const transactionId = generateNOWPaymentsOrderId('KGTSUB')
      await prisma.payment.create({
        data: {
          userId: authUser.userId,
          amount: price,
          currency: 'USD',
          method: 'NOWPAYMENTS',
          status: 'PENDING',
          transactionId,
          metadata: JSON.stringify({
            kind: 'SUBSCRIPTION',
            companyId: data.companyId,
            planId: data.planId,
            billingCycle: data.billingCycle,
            captureStatus: 'invoice_created',
          }),
        },
      })

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      const checkout = await createNOWPaymentsInvoice({
        amount: price,
        currency: 'USD',
        orderId: transactionId,
        description: `${plan.name} ${data.billingCycle} subscription`,
        successUrl: getPackagePaymentReturnUrl('success', 'nowpayments'),
        cancelUrl: getPackagePaymentReturnUrl('cancelled', 'nowpayments'),
        ipnCallbackUrl: `${baseUrl}/api/payments/nowpayments/callback`,
      })

      return successResponse({ checkoutUrl: checkout.url }, 'NOWPayments invoice created')
    }

    if (data.paymentMethod === 'MANUAL') {
      const price = data.billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice

      await prisma.manualPaymentRequest.create({
        data: {
          companyId: data.companyId,
          planId: data.planId,
          amount: price,
          currency: 'USD',
        },
      })

      return successResponse(
        null,
        'Manual payment request submitted. Kaniz Global Trade will activate your subscription after verification.',
        undefined,
        201
      )
    }

    throw new ApiError(400, 'Unsupported payment method')
  } catch (error) {
    return handleApiError(error)
  }
}
