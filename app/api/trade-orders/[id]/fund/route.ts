import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError, assertComplianceAccess } from '@/lib/permissions'
import { createNotification } from '@/server/services/notification'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { createOneTimeCheckoutSession, createStripeCustomer } from '@/lib/payment/stripe'
import { createSSLCommerzSession, generateSSLCommerzTransactionId } from '@/lib/payment/sslcommerz'
import { createAamarPaySession, generateAamarPayTransactionId } from '@/lib/payment/aamarpay'
import { createNOWPaymentsInvoice, generateNOWPaymentsOrderId } from '@/lib/payment/nowpayments'
import { buildAppUrl, resolveAppUrl } from '@/lib/payment/urls'
import { FraudEventType } from '@prisma/client'
import { assertFraudActionAllowed, screenFraudEvent } from '@/lib/fraud/service'
import { FRAUD_ACTIONS } from '@/lib/fraud/shared'

const fundSchema = z.object({
  method: z.enum(['STRIPE', 'SSLCOMMERZ', 'AAMARPAY', 'NOWPAYMENTS', 'PAYPAL', 'BANK_TRANSFER', 'MANUAL']).default('MANUAL'),
  transactionId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const data = fundSchema.parse(await req.json())

    const order = await prisma.tradeOrder.findUnique({
      where: { id },
      include: {
        escrowAccount: true,
        payments: { where: { method: 'STRIPE' }, orderBy: { createdAt: 'desc' }, take: 1 },
        supplierCompany: {
          include: {
            companyUsers: {
              where: { isPrimary: true },
              select: { userId: true },
            },
          },
        },
      },
    })

    if (!order || !order.escrowAccount) throw new ApiError(404, 'Trade order not found')
    if (order.buyerId !== authUser.userId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) throw new ApiError(403, 'Access denied')
    if (order.status !== 'PENDING_ESCROW_PAYMENT') throw new ApiError(400, 'Order is not awaiting escrow funding')

    await assertFraudActionAllowed({
      userId: authUser.userId,
      companyId: order.supplierCompanyId,
      action: FRAUD_ACTIONS.PAYMENT_ACTIVITY,
    })
    if (!authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      await assertComplianceAccess({
        userId: authUser.userId,
        audience: 'BUYER',
      })
    }

    const buyer = await prisma.user.findUnique({ where: { id: authUser.userId } })
    if (!buyer) throw new ApiError(404, 'Buyer not found')

    if (data.method === 'STRIPE') {
      const stripeCustomerId = await createStripeCustomer(buyer.email, `${buyer.firstName} ${buyer.lastName}`)

      const successUrl = buildAppUrl('/buyer/trade-orders', { payment: 'success' })
      const cancelUrl = buildAppUrl('/buyer/trade-orders', { payment: 'cancelled' })
      const checkout = await createOneTimeCheckoutSession({
        customerId: stripeCustomerId,
        successUrl,
        cancelUrl,
        metadata: {
          kind: 'TRADE_ORDER',
          tradeOrderId: order.id,
          buyerId: authUser.userId,
          supplierCompanyId: order.supplierCompanyId,
        },
        lineItems: [
          {
            name: `Trade Assurance: ${order.productName}`,
            description: `Escrow-backed order funding for ${order.productName}`,
            amount: Number(order.totalAmount),
            currency: order.currencyCode,
          },
        ],
      })

      await prisma.payment.create({
        data: {
          userId: authUser.userId,
          tradeOrderId: order.id,
          amount: order.totalAmount,
          currency: order.currencyCode,
          method: 'STRIPE',
          status: 'PENDING',
          stripePaymentId: checkout.id,
          transactionId: data.transactionId,
          metadata: JSON.stringify({
            ...(data.metadata || {}),
            checkoutSessionId: checkout.id,
            captureStatus: 'checkout_created',
          }),
        },
      })

      return successResponse({ checkoutUrl: checkout.url }, 'Stripe checkout session created')
    }

    if (data.method === 'SSLCOMMERZ') {
      const transactionId = data.transactionId || generateSSLCommerzTransactionId('KGTTO')
      const payment = await prisma.payment.create({
        data: {
          userId: authUser.userId,
          tradeOrderId: order.id,
          amount: order.totalAmount,
          currency: order.currencyCode,
          method: 'SSLCOMMERZ',
          status: 'PENDING',
          transactionId,
          metadata: JSON.stringify({
            ...(data.metadata || {}),
            kind: 'TRADE_ORDER',
            tradeOrderId: order.id,
            buyerId: authUser.userId,
            supplierCompanyId: order.supplierCompanyId,
            captureStatus: 'checkout_created',
          }),
        },
      })

      const callbackUrl = buildAppUrl('/api/payments/sslcommerz/callback')
      const checkout = await createSSLCommerzSession({
        amount: Number(order.totalAmount),
        currency: order.currencyCode,
        transactionId,
        productName: `Trade Assurance: ${order.productName}`,
        productCategory: 'trade-order',
        successUrl: callbackUrl,
        failUrl: callbackUrl,
        cancelUrl: callbackUrl,
        ipnUrl: callbackUrl,
        customer: {
          name: `${buyer.firstName} ${buyer.lastName}`.trim(),
          email: buyer.email,
          phone: buyer.phone || undefined,
          address1: order.shippingAddress || 'Dhaka, Bangladesh',
        },
        shipping: {
          method: 'Courier',
          name: `${buyer.firstName} ${buyer.lastName}`.trim(),
          address1: order.shippingAddress || 'Dhaka, Bangladesh',
          numOfItems: Number(order.quantity) || 1,
        },
        valueA: payment.id,
        valueB: order.id,
        valueC: 'TRADE_ORDER',
        valueD: authUser.userId,
      })

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: JSON.stringify({
            ...(data.metadata || {}),
            kind: 'TRADE_ORDER',
            tradeOrderId: order.id,
            buyerId: authUser.userId,
            supplierCompanyId: order.supplierCompanyId,
            captureStatus: 'checkout_created',
            sessionKey: checkout.sessionKey,
          }),
        },
      })

      return successResponse({ checkoutUrl: checkout.url }, 'SSLCommerz checkout session created')
    }

    if (data.method === 'AAMARPAY') {
      const transactionId = data.transactionId || generateAamarPayTransactionId('KGTTO')
      await prisma.payment.create({
        data: {
          userId: authUser.userId,
          tradeOrderId: order.id,
          amount: order.totalAmount,
          currency: order.currencyCode,
          method: 'AAMARPAY',
          status: 'PENDING',
          transactionId,
          metadata: JSON.stringify({
            ...(data.metadata || {}),
            kind: 'TRADE_ORDER',
            tradeOrderId: order.id,
            buyerId: authUser.userId,
            supplierCompanyId: order.supplierCompanyId,
            captureStatus: 'checkout_created',
          }),
        },
      })

      const callbackUrl = buildAppUrl('/api/payments/aamarpay/callback')
      const checkout = await createAamarPaySession({
        amount: Number(order.totalAmount),
        currency: order.currencyCode,
        transactionId,
        description: `Trade assurance funding for ${order.productName}`,
        successUrl: callbackUrl,
        failUrl: callbackUrl,
        cancelUrl: callbackUrl,
        customer: {
          name: `${buyer.firstName} ${buyer.lastName}`.trim(),
          email: buyer.email,
          phone: buyer.phone || '01700000000',
          address1: order.shippingAddress || 'Dhaka, Bangladesh',
          city: 'Dhaka',
          state: 'Dhaka',
          postcode: '1000',
          country: 'Bangladesh',
        },
        optA: order.id,
        optB: 'TRADE_ORDER',
        optC: authUser.userId,
        optD: order.supplierCompanyId,
      })

      return successResponse({ checkoutUrl: checkout.url }, 'aamarPay checkout session created')
    }

    if (data.method === 'NOWPAYMENTS') {
      const transactionId = data.transactionId || generateNOWPaymentsOrderId('KGTTO')
      await prisma.payment.create({
        data: {
          userId: authUser.userId,
          tradeOrderId: order.id,
          amount: order.totalAmount,
          currency: order.currencyCode,
          method: 'NOWPAYMENTS',
          status: 'PENDING',
          transactionId,
          metadata: JSON.stringify({
            ...(data.metadata || {}),
            kind: 'TRADE_ORDER',
            tradeOrderId: order.id,
            buyerId: authUser.userId,
            supplierCompanyId: order.supplierCompanyId,
            captureStatus: 'invoice_created',
          }),
        },
      })

      const baseUrl = resolveAppUrl()
      const checkout = await createNOWPaymentsInvoice({
        amount: Number(order.totalAmount),
        currency: order.currencyCode,
        orderId: transactionId,
        description: `Trade assurance funding for ${order.productName}`,
        successUrl: `${baseUrl}/buyer/trade-orders?payment=success`,
        cancelUrl: `${baseUrl}/buyer/trade-orders?payment=cancelled`,
        ipnCallbackUrl: `${baseUrl}/api/payments/nowpayments/callback`,
      })

      return successResponse({ checkoutUrl: checkout.url }, 'NOWPayments invoice created')
    }

    const updated = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId: authUser.userId,
          tradeOrderId: order.id,
          amount: order.totalAmount,
          currency: order.currencyCode,
          method: data.method,
          status: 'PAID',
          transactionId: data.transactionId,
          metadata: JSON.stringify({
            ...(data.metadata || {}),
            captureStatus: 'manual_paid',
          }),
        },
      })

      await tx.escrowAccount.update({
        where: { id: order.escrowAccount!.id },
        data: {
          paymentId: payment.id,
          status: 'HELD',
          fundedAt: new Date(),
          termsAccepted: true,
        },
      })

      await tx.escrowTransaction.updateMany({
        where: {
          tradeOrderId: order.id,
          escrowAccountId: order.escrowAccount!.id,
          type: 'FUNDING',
          status: 'PENDING',
        },
        data: {
          paymentId: payment.id,
          status: 'COMPLETED',
        },
      })

      return tx.tradeOrder.update({
        where: { id: order.id },
        data: {
          status: 'ESCROW_FUNDED',
          fundedAt: new Date(),
        },
        include: { escrowAccount: true, payments: true, commission: true },
      })
    })

    const supplierOwnerId = order.supplierCompany.companyUsers[0]?.userId
    if (supplierOwnerId) {
      await createNotification({
        userId: supplierOwnerId,
        type: 'ESCROW_UPDATE',
        title: 'Escrow Funded',
        message: `Escrow has been funded for order ${order.productName}. You can now begin production.`,
        data: { tradeOrderId: order.id },
      })
    }

    await screenFraudEvent({
      req,
      actorUserId: authUser.userId,
      userId: authUser.userId,
      companyId: order.supplierCompanyId,
      eventType: FraudEventType.PAYMENT_ACTIVITY,
      sourceModule: 'trade-orders/fund',
      title: 'Trade escrow funding attempt',
      summary: `Payment flow started with ${data.method}.`,
      payload: {
        method: data.method,
        amount: order.totalAmount?.toString(),
        currencyCode: order.currencyCode,
        tradeOrderId: order.id,
      },
    })

    return successResponse(updated, 'Escrow funded successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
