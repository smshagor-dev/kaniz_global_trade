import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, isAdmin, isSupplier, requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { AD_PAYMENT_METHODS, type AdPaymentMethod } from '@/lib/advertising/payment'
import { createOneTimeCheckoutSession, createStripeCustomer } from '@/lib/payment/stripe'
import { createSSLCommerzSession, generateSSLCommerzTransactionId } from '@/lib/payment/sslcommerz'
import { createAamarPaySession, generateAamarPayTransactionId } from '@/lib/payment/aamarpay'
import { createNOWPaymentsInvoice, generateNOWPaymentsOrderId } from '@/lib/payment/nowpayments'
import { assertAdPaymentMethodEnabled, buildAdPaymentMetadata, getAdPaymentReturnUrl } from '@/lib/advertising/payment'

const schema = z.object({
  paymentMethod: z.enum(AD_PAYMENT_METHODS).default('STRIPE'),
})

async function createCheckout(params: {
  authUser: { userId: string; companyId?: string; email: string }
  campaign: { id: string; title: string; budget: number; placement: string; companyId: string }
  paymentMethod: AdPaymentMethod
}) {
  await assertAdPaymentMethodEnabled(params.paymentMethod)
  const user = await prisma.user.findUnique({
    where: { id: params.authUser.userId },
    select: { email: true, firstName: true, lastName: true, phone: true },
  })
  if (!user) throw new ApiError(404, 'User not found')

  const metadata = buildAdPaymentMetadata(params.campaign.id, params.campaign.companyId)
  const amount = Number(params.campaign.budget)

  if (params.paymentMethod === 'STRIPE') {
    const customerId = await createStripeCustomer(user.email, `${user.firstName} ${user.lastName}`.trim())
    const successUrl = getAdPaymentReturnUrl('success', 'stripe', params.campaign.id)
    const cancelUrl = getAdPaymentReturnUrl('cancelled', 'stripe', params.campaign.id)
    const checkout = await createOneTimeCheckoutSession({
      customerId,
      successUrl,
      cancelUrl,
      lineItems: [
        {
          name: params.campaign.title,
          description: `Advertising placement ${params.campaign.placement.replaceAll('_', ' ')}`,
          amount,
          currency: 'USD',
        },
      ],
      metadata: { ...metadata, gateway: 'STRIPE' },
    })

    await prisma.payment.create({
      data: {
        userId: params.authUser.userId,
        amount,
        currency: 'USD',
        method: 'STRIPE',
        status: 'PENDING',
        stripePaymentId: checkout.id,
        metadata: JSON.stringify(metadata),
      },
    })

    return checkout.url
  }

  if (params.paymentMethod === 'SSLCOMMERZ') {
    const transactionId = generateSSLCommerzTransactionId('KGTADS')
    const payment = await prisma.payment.create({
      data: {
        userId: params.authUser.userId,
        amount,
        currency: 'USD',
        method: 'SSLCOMMERZ',
        status: 'PENDING',
        transactionId,
        metadata: JSON.stringify(metadata),
      },
    })

    try {
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/sslcommerz/callback`
      const checkout = await createSSLCommerzSession({
        amount,
        currency: 'USD',
        transactionId,
        productName: params.campaign.title,
        productCategory: 'advertising',
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
        valueB: params.campaign.id,
        valueC: 'AD_CAMPAIGN',
        valueD: params.campaign.companyId,
      })

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: JSON.stringify({
            ...metadata,
            gateway: 'SSLCOMMERZ',
            sessionKey: checkout.sessionKey,
          }),
        },
      })

      return checkout.url
    } catch (error) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: error instanceof Error ? error.message : 'SSLCommerz checkout failed',
        },
      })
      throw error
    }
  }

  if (params.paymentMethod === 'AAMARPAY') {
    const transactionId = generateAamarPayTransactionId('KGTADS')
    const payment = await prisma.payment.create({
      data: {
        userId: params.authUser.userId,
        amount,
        currency: 'USD',
        method: 'AAMARPAY',
        status: 'PENDING',
        transactionId,
        metadata: JSON.stringify(metadata),
      },
    })

    try {
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/aamarpay/callback`
      const checkout = await createAamarPaySession({
        amount,
        currency: 'USD',
        transactionId,
        description: `${params.campaign.title} advertising campaign`,
        successUrl: callbackUrl,
        failUrl: callbackUrl,
        cancelUrl: callbackUrl,
        customer: {
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          phone: user.phone || '01700000000',
          address1: 'Dhaka',
          city: 'Dhaka',
          state: 'Dhaka',
          postcode: '1000',
          country: 'Bangladesh',
        },
        optA: params.campaign.id,
        optB: params.campaign.companyId,
        optC: 'AD_CAMPAIGN',
        optD: payment.id,
      })

      return checkout.url
    } catch (error) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: error instanceof Error ? error.message : 'aamarPay checkout failed',
        },
      })
      throw error
    }
  }

  const transactionId = generateNOWPaymentsOrderId('KGTADS')
  const payment = await prisma.payment.create({
    data: {
      userId: params.authUser.userId,
      amount,
      currency: 'USD',
      method: 'NOWPAYMENTS',
      status: 'PENDING',
      transactionId,
      metadata: JSON.stringify({
        ...metadata,
        gateway: 'NOWPAYMENTS',
        captureStatus: 'invoice_created',
      }),
    },
  })

  try {
    const checkout = await createNOWPaymentsInvoice({
      amount,
      currency: 'USD',
      orderId: transactionId,
      description: `${params.campaign.title} advertising campaign`,
      successUrl: getAdPaymentReturnUrl('success', 'nowpayments', params.campaign.id),
      cancelUrl: getAdPaymentReturnUrl('cancelled', 'nowpayments', params.campaign.id),
      ipnCallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/nowpayments/callback`,
    })

    return checkout.url
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failureReason: error instanceof Error ? error.message : 'NOWPayments checkout failed',
      },
    })
    throw error
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth(req)
    if (!isSupplier(authUser) && !isAdmin(authUser)) {
      throw new ApiError(403, 'Supplier access required')
    }

    const { id } = await context.params
    const data = schema.parse(await req.json())
    const campaign = await prisma.adCampaign.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        title: true,
        budget: true,
        placement: true,
        status: true,
      },
    })

    if (!campaign) throw new ApiError(404, 'Ad campaign not found')
    if (!isAdmin(authUser) && campaign.companyId !== authUser.companyId) {
      throw new ApiError(403, 'This ad campaign does not belong to your supplier account')
    }
    if (campaign.status !== 'DRAFT') {
      throw new ApiError(409, 'Only unpaid draft campaigns can be paid again')
    }

    const checkoutUrl = await createCheckout({
      authUser,
      campaign: {
        id: campaign.id,
        companyId: campaign.companyId,
        title: campaign.title,
        budget: Number(campaign.budget),
        placement: campaign.placement,
      },
      paymentMethod: data.paymentMethod,
    })

    return successResponse({ checkoutUrl }, 'Ad campaign checkout session created')
  } catch (error) {
    return handleApiError(error)
  }
}
