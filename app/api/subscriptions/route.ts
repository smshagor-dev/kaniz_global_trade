import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError } from '@/lib/utils/api'
import { createCheckoutSession, createStripeCustomer } from '@/lib/payment/stripe'
import { createNotification } from '@/server/services/notification'

const subscribeSchema = z.object({
  companyId: z.string(),
  planId: z.string(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  paymentMethod: z.enum(['STRIPE', 'PAYPAL', 'MANUAL']).default('STRIPE'),
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

    if (data.paymentMethod === 'STRIPE') {
      let subscription = await prisma.subscription.findUnique({ where: { companyId: data.companyId } })

      let stripeCustomerId = subscription?.stripeCustomerId
      if (!stripeCustomerId) {
        stripeCustomerId = await createStripeCustomer(user.email, `${user.firstName} ${user.lastName}`)
      }

      const priceId = data.billingCycle === 'YEARLY' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly
      if (!priceId) throw new ApiError(400, 'Stripe price not configured for this plan')

      const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?success=true`
      const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`

      const checkoutUrl = await createCheckoutSession(
        stripeCustomerId,
        priceId,
        successUrl,
        cancelUrl,
        { companyId: data.companyId, planId: data.planId }
      )

      return successResponse({ checkoutUrl }, 'Stripe checkout session created')
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
        'Manual payment request submitted. Admin will activate your subscription after verification.',
        undefined,
        201
      )
    }

    throw new ApiError(400, 'Unsupported payment method')
  } catch (error) {
    return handleApiError(error)
  }
}
