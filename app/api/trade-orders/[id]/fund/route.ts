import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { createNotification } from '@/server/services/notification'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { createOneTimeCheckoutSession, createStripeCustomer } from '@/lib/payment/stripe'

const fundSchema = z.object({
  method: z.enum(['STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'MANUAL']).default('MANUAL'),
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

    const buyer = await prisma.user.findUnique({ where: { id: authUser.userId } })
    if (!buyer) throw new ApiError(404, 'Buyer not found')

    if (data.method === 'STRIPE') {
      const stripeCustomerId = await createStripeCustomer(buyer.email, `${buyer.firstName} ${buyer.lastName}`)

      const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/buyer/trade-orders?payment=success`
      const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/buyer/trade-orders?payment=cancelled`
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

    return successResponse(updated, 'Escrow funded successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
