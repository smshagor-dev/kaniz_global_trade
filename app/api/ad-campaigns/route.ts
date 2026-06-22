import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, isAdmin, isSupplier, requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { AD_PLACEMENTS, getAdvertisingSettings } from '@/lib/advertising/settings'
import {
  AD_PAYMENT_METHODS,
  assertAdPaymentMethodEnabled,
  buildAdPaymentMetadata,
  getAdPaymentMethods,
  getAdPaymentReturnUrl,
  getCampaignPaymentSummary,
  type AdPaymentMethod,
} from '@/lib/advertising/payment'
import { createOneTimeCheckoutSession, createStripeCustomer } from '@/lib/payment/stripe'
import { createSSLCommerzSession, generateSSLCommerzTransactionId } from '@/lib/payment/sslcommerz'
import { createAamarPaySession, generateAamarPayTransactionId } from '@/lib/payment/aamarpay'
import { createNOWPaymentsInvoice, generateNOWPaymentsOrderId } from '@/lib/payment/nowpayments'

const createSchema = z.object({
  productId: z.string().optional(),
  title: z.string().min(3),
  placement: z.enum(AD_PLACEMENTS),
  budget: z.number().positive(),
  bidAmount: z.number().nonnegative().default(0),
  targetKeyword: z.string().optional(),
  creativeUrl: z.string().url().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  paymentMethod: z.enum(AD_PAYMENT_METHODS).default('STRIPE'),
})

function formatCampaign<T extends Record<string, unknown> & {
  budget: unknown
  bidAmount: unknown
  spent?: unknown
}>(campaign: T, paymentSummary?: { status: string; method: string; failureReason: string | null; updatedAt: string }) {
  return {
    ...campaign,
    budget: Number(campaign.budget || 0),
    bidAmount: Number(campaign.bidAmount || 0),
    spent: Number(campaign.spent || 0),
    paymentStatus: paymentSummary?.status || null,
    paymentMethod: paymentSummary?.method || null,
    paymentFailureReason: paymentSummary?.failureReason || null,
    paymentUpdatedAt: paymentSummary?.updatedAt || null,
  }
}

async function createCampaignCheckout(params: {
  authUser: { userId: string; companyId?: string; email: string }
  campaign: {
    id: string
    title: string
    budget: number
    placement: string
    companyId: string
  }
  paymentMethod: AdPaymentMethod
}) {
  await assertAdPaymentMethodEnabled(params.paymentMethod)

  const user = await prisma.user.findUnique({
    where: { id: params.authUser.userId },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true },
  })
  if (!user) throw new ApiError(404, 'User not found')

  const metadata = buildAdPaymentMetadata(params.campaign.id, params.campaign.companyId)
  const amount = Number(params.campaign.budget)
  const paymentData = {
    userId: params.authUser.userId,
    amount,
    currency: 'USD',
    method: params.paymentMethod,
    status: 'PENDING' as const,
    metadata: JSON.stringify(metadata),
  }

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
      metadata: {
        ...metadata,
        gateway: 'STRIPE',
      },
    })

    await prisma.payment.create({
      data: {
        ...paymentData,
        stripePaymentId: checkout.id,
      },
    })

    return { checkoutUrl: checkout.url }
  }

  if (params.paymentMethod === 'SSLCOMMERZ') {
    const transactionId = generateSSLCommerzTransactionId('KGTADS')
    const payment = await prisma.payment.create({
      data: {
        ...paymentData,
        transactionId,
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

      return { checkoutUrl: checkout.url }
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
        ...paymentData,
        transactionId,
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

      return { checkoutUrl: checkout.url }
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
      ...paymentData,
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

    return { checkoutUrl: checkout.url }
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

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (!isSupplier(authUser) && !isAdmin(authUser)) {
      throw new ApiError(403, 'Supplier access required')
    }

    const where: Record<string, unknown> = {}
    if (authUser.companyId && !isAdmin(authUser)) {
      where.companyId = authUser.companyId
    }

    const [campaigns, products, paymentMethods] = await Promise.all([
      prisma.adCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true, slug: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      authUser.companyId
        ? prisma.product.findMany({
            where: { companyId: authUser.companyId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: { id: true, name: true, slug: true, thumbnailUrl: true },
          })
        : Promise.resolve([]),
      getAdPaymentMethods(),
    ])

    const paymentSummary = await getCampaignPaymentSummary(campaigns.map((campaign) => campaign.id))

    return successResponse({
      items: campaigns.map((campaign) => formatCampaign(campaign, paymentSummary.get(campaign.id))),
      products,
      paymentMethods: paymentMethods.filter((method) => method.enabled),
    }, 'Ad campaigns fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (!isSupplier(authUser) && !isAdmin(authUser)) {
      throw new ApiError(403, 'Supplier access required')
    }
    if (!authUser.companyId) throw new ApiError(403, 'Supplier company required')

    const advertisingSettings = await getAdvertisingSettings()
    if (!advertisingSettings.enabled) throw new ApiError(403, 'Advertising is currently disabled by Kaniz Global Trade')
    const data = createSchema.parse(await req.json())

    if (advertisingSettings.requireProductLink && !data.productId) {
      throw new ApiError(422, 'A linked product is required for advertising campaigns')
    }

    if (!advertisingSettings.allowedPlacements.includes(data.placement)) {
      throw new ApiError(422, 'This advertising placement is currently unavailable')
    }

    if (data.budget < advertisingSettings.minBudget || data.budget > advertisingSettings.maxBudget) {
      throw new ApiError(422, `Budget must be between ${advertisingSettings.minBudget} and ${advertisingSettings.maxBudget}`)
    }

    if (data.bidAmount < advertisingSettings.minBid || data.bidAmount > advertisingSettings.maxBid) {
      throw new ApiError(422, `Bid amount must be between ${advertisingSettings.minBid} and ${advertisingSettings.maxBid}`)
    }

    if (data.productId) {
      const product = await prisma.product.findFirst({
        where: {
          id: data.productId,
          companyId: authUser.companyId,
          deletedAt: null,
        },
        select: { id: true },
      })
      if (!product) throw new ApiError(404, 'Linked product not found for this supplier')
    }

    const startsAt = new Date(data.startsAt)
    const endsAt = new Date(data.endsAt)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new ApiError(422, 'Valid campaign dates are required')
    }
    if (endsAt <= startsAt) {
      throw new ApiError(422, 'Campaign end date must be after the start date')
    }

    const campaign = await prisma.adCampaign.create({
      data: {
        companyId: authUser.companyId,
        productId: data.productId,
        title: data.title.trim(),
        placement: data.placement,
        budget: data.budget,
        bidAmount: data.bidAmount,
        targetKeyword: data.targetKeyword?.trim() || null,
        creativeUrl: data.creativeUrl,
        startsAt,
        endsAt,
        status: 'DRAFT',
        rejectionReason: null,
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    })

    const { checkoutUrl } = await createCampaignCheckout({
      authUser,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        budget: Number(campaign.budget),
        placement: campaign.placement,
        companyId: campaign.companyId,
      },
      paymentMethod: data.paymentMethod,
    })

    return successResponse({
      campaign: formatCampaign(campaign, {
        status: 'PENDING',
        method: data.paymentMethod,
        failureReason: null,
        updatedAt: new Date().toISOString(),
      }),
      checkoutUrl,
    }, 'Ad campaign draft created. Complete payment to activate processing.', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
