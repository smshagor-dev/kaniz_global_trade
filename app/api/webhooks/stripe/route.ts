import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/payment/stripe'
import prisma from '@/lib/db/prisma'
import { createNotification } from '@/server/services/notification'
import { sendSubscriptionExpiryEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = await constructWebhookEvent(body, sig)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          id: string
          metadata?: Record<string, string>
          customer?: string
          subscription?: string
          payment_intent?: string
          amount_total?: number
          currency?: string
        }
        const metadata = session.metadata || {}

        if (metadata.kind === 'TRADE_ORDER' && metadata.tradeOrderId && metadata.buyerId && metadata.supplierCompanyId) {
          const order = await prisma.tradeOrder.findUnique({
            where: { id: metadata.tradeOrderId },
            include: {
              escrowAccount: true,
              supplierCompany: {
                include: { companyUsers: { where: { isPrimary: true }, select: { userId: true } } },
              },
            },
          })
          if (!order?.escrowAccount) break

          await prisma.$transaction([
            prisma.payment.updateMany({
              where: { tradeOrderId: order.id, stripePaymentId: session.id },
              data: {
                status: 'PAID',
                stripePaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
                metadata: JSON.stringify({
                  checkoutSessionId: session.id,
                  paymentIntentId: session.payment_intent,
                  captureStatus: 'paid',
                }),
              },
            }),
            prisma.escrowAccount.update({
              where: { id: order.escrowAccount.id },
              data: {
                status: 'HELD',
                fundedAt: new Date(),
                termsAccepted: true,
              },
            }),
            prisma.tradeOrder.update({
              where: { id: order.id },
              data: {
                status: 'ESCROW_FUNDED',
                fundedAt: new Date(),
              },
            }),
          ])

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
          break
        }

        if (metadata.kind === 'SAMPLE_ORDER' && metadata.sampleOrderId) {
          const sampleOrder = await prisma.sampleOrder.findUnique({
            where: { id: metadata.sampleOrderId },
          })
          if (!sampleOrder) break

          await prisma.$transaction([
            prisma.payment.updateMany({
              where: { sampleOrderId: sampleOrder.id, stripePaymentId: session.id },
              data: {
                status: 'PAID',
                stripePaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
                metadata: JSON.stringify({
                  checkoutSessionId: session.id,
                  paymentIntentId: session.payment_intent,
                  captureStatus: 'paid',
                }),
              },
            }),
            prisma.sampleOrder.update({
              where: { id: sampleOrder.id },
              data: { status: 'PENDING_SUPPLIER_CONFIRMATION' },
            }),
          ])

          const company = await prisma.company.findUnique({
            where: { id: sampleOrder.supplierCompanyId },
            include: { companyUsers: { where: { isPrimary: true }, select: { userId: true } } },
          })
          const supplierOwnerId = company?.companyUsers[0]?.userId
          if (supplierOwnerId) {
            await createNotification({
              userId: supplierOwnerId,
              type: 'SAMPLE_ORDER_UPDATE',
              title: 'New Sample Order',
              message: `A buyer requested a sample: ${sampleOrder.title}.`,
              data: { sampleOrderId: sampleOrder.id },
            })
          }
          break
        }

        const { companyId, planId } = metadata
        if (!companyId || !planId) break

        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
        if (!plan) break

        const now = new Date()
        const periodEnd = new Date(now)
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        await prisma.subscription.upsert({
          where: { companyId },
          create: {
            companyId,
            planId,
            status: 'ACTIVE',
            billingCycle: 'MONTHLY',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            stripeCustomerId: session.customer as string,
            stripeSubId: session.subscription as string,
          },
          update: {
            planId,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            stripeCustomerId: session.customer as string,
            stripeSubId: session.subscription as string,
          },
        })

        await prisma.company.update({
          where: { id: companyId },
          data: {
            isPremium: plan.featuredCompany,
            isFeatured: plan.featuredCompany,
          },
        })

        const owner = await prisma.companyUser.findFirst({
          where: { companyId, isPrimary: true },
        })
        if (owner) {
          await createNotification({
            userId: owner.userId,
            type: 'PAYMENT_SUCCESS',
            title: 'Subscription Activated',
            message: `Your ${plan.name} subscription is now active.`,
            data: { planId },
          })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as { subscription?: string; amount_paid?: number; currency?: string; id?: string }
        if (!invoice.subscription) break

        const sub = await prisma.subscription.findFirst({
          where: { stripeSubId: invoice.subscription as string },
        })
        if (!sub) break

        const now = new Date()
        const periodEnd = new Date(now)
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        })

        const invoiceNumber = `INV-${Date.now()}`
        const amount = (invoice.amount_paid || 0) / 100

        const dbInvoice = await prisma.invoice.create({
          data: {
            subscriptionId: sub.id,
            invoiceNumber,
            amount,
            total: amount,
            currency: invoice.currency?.toUpperCase() || 'USD',
            status: 'PAID',
            dueDate: now,
            paidAt: now,
            stripeInvoiceId: invoice.id,
          },
        })

        const owner = await prisma.companyUser.findFirst({
          where: { companyId: sub.companyId, isPrimary: true },
          include: { user: { select: { id: true } } },
        })
        if (owner) {
          await prisma.payment.create({
            data: {
              invoiceId: dbInvoice.id,
              userId: owner.userId,
              amount,
              currency: invoice.currency?.toUpperCase() || 'USD',
              method: 'STRIPE',
              status: 'PAID',
              stripePaymentId: invoice.id,
            },
          })
          await createNotification({
            userId: owner.userId,
            type: 'PAYMENT_SUCCESS',
            title: 'Payment Successful',
            message: `Invoice ${invoiceNumber} paid: $${amount}`,
            data: { invoiceId: dbInvoice.id },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as { subscription?: string }
        if (!invoice.subscription) break

        const sub = await prisma.subscription.findFirst({
          where: { stripeSubId: invoice.subscription as string },
          include: { plan: true },
        })
        if (!sub) break

        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'PAST_DUE' },
        })

        const owner = await prisma.companyUser.findFirst({
          where: { companyId: sub.companyId, isPrimary: true },
          include: { user: { select: { id: true, email: true, firstName: true } } },
        })
        if (owner) {
          await createNotification({
            userId: owner.userId,
            type: 'PAYMENT_FAILED',
            title: 'Payment Failed',
            message: 'Your subscription payment failed. Please update your payment method.',
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as { id: string }
        await prisma.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
