import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { createNotification } from '@/server/services/notification'
import { sendInvoicePaidEmail } from '@/lib/email'
import { finalizeAdCampaignPayment } from '@/lib/advertising/payment'
import { FraudEventType } from '@prisma/client'
import { screenFraudEvent } from '@/lib/fraud/service'
import { assertPaymentStatusTransition, enforceWebhookIdempotency, verifyWebhookSignature } from '@/lib/payment/safety'
import { logPaymentWebhookFailureEvent } from '@/lib/monitoring/event-helpers'

export async function POST(req: NextRequest) {
  const body = await req.text()

  let event
  try {
    event = await verifyWebhookSignature({
      provider: 'STRIPE',
      req,
      rawBody: body,
    }) as {
      id: string
      type: string
      data: { object: unknown }
    }
  } catch (err) {
    const status = typeof err === 'object' && err && 'statusCode' in err ? Number(err.statusCode) || 400 : 400
    await logPaymentWebhookFailureEvent({
      provider: 'STRIPE',
      message: 'Stripe webhook rejected due to invalid signature.',
      reason: err instanceof Error ? err.message : 'invalid_signature',
    })
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status })
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

        if (metadata.kind === 'AD_CAMPAIGN' && metadata.adCampaignId) {
          const payment = await prisma.payment.findFirst({
            where: { stripePaymentId: session.id },
            select: { id: true, status: true, metadata: true },
          })

          if (payment) {
            const idempotency = await enforceWebhookIdempotency({
              paymentId: payment.id,
              eventKey: `STRIPE:${event.id}`,
              metadata: payment.metadata,
            })
            if (idempotency.duplicate || payment.status === 'PAID') break
            assertPaymentStatusTransition(payment.status, 'PAID')
            await finalizeAdCampaignPayment(payment.id, {
              checkoutSessionId: session.id,
              paymentIntentId: session.payment_intent,
              captureStatus: 'paid',
            }, 'STRIPE')
          }
          break
        }

        if (metadata.kind === 'TRADE_ORDER' && metadata.tradeOrderId && metadata.buyerId && metadata.supplierCompanyId) {
          const payment = await prisma.payment.findFirst({
            where: { tradeOrderId: metadata.tradeOrderId, stripePaymentId: session.id },
            select: { id: true, status: true, metadata: true },
          })
          if (!payment) break

          const idempotency = await enforceWebhookIdempotency({
            paymentId: payment.id,
            eventKey: `STRIPE:${event.id}`,
            metadata: payment.metadata,
          })
          if (idempotency.duplicate || payment.status === 'PAID') break
          assertPaymentStatusTransition(payment.status, 'PAID')

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
            prisma.escrowTransaction.updateMany({
              where: {
                tradeOrderId: order.id,
                escrowAccountId: order.escrowAccount.id,
                type: 'FUNDING',
                status: 'PENDING',
              },
              data: {
                status: 'COMPLETED',
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
          await screenFraudEvent({
            req,
            actorUserId: metadata.buyerId,
            userId: metadata.buyerId,
            companyId: metadata.supplierCompanyId,
            eventType: FraudEventType.PAYMENT_ACTIVITY,
            sourceModule: 'payments/stripe/webhook',
            title: 'Stripe trade order payment confirmed',
            summary: 'Stripe checkout completed for escrow funding.',
            payload: {
              kind: metadata.kind,
              tradeOrderId: metadata.tradeOrderId,
              amount: session.amount_total,
              currency: session.currency,
            },
          })
          break
        }

        if (metadata.kind === 'SAMPLE_ORDER' && metadata.sampleOrderId) {
          const payment = await prisma.payment.findFirst({
            where: { sampleOrderId: metadata.sampleOrderId, stripePaymentId: session.id },
            select: { id: true, userId: true, status: true, metadata: true },
          })
          if (!payment) break

          const idempotency = await enforceWebhookIdempotency({
            paymentId: payment.id,
            eventKey: `STRIPE:${event.id}`,
            metadata: payment.metadata,
          })
          if (idempotency.duplicate || payment.status === 'PAID') break
          assertPaymentStatusTransition(payment.status, 'PAID')

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
          await screenFraudEvent({
            req,
            actorUserId: metadata.buyerId || payment?.userId || '',
            userId: metadata.buyerId || payment?.userId || '',
            companyId: metadata.supplierCompanyId || sampleOrder.supplierCompanyId,
            eventType: FraudEventType.PAYMENT_ACTIVITY,
            sourceModule: 'payments/stripe/webhook',
            title: 'Stripe sample order payment confirmed',
            summary: 'Stripe checkout completed for a sample order.',
            payload: {
              kind: metadata.kind,
              sampleOrderId: metadata.sampleOrderId,
              amount: session.amount_total,
              currency: session.currency,
            },
          })
          break
        }

        const { companyId, planId, billingCycle } = metadata
        if (!companyId || !planId) break

        const subscriptionPayment = await prisma.payment.findFirst({
          where: { stripePaymentId: session.id, userId: metadata.buyerId || undefined },
          select: { id: true, status: true, metadata: true },
        })
        if (subscriptionPayment) {
          const idempotency = await enforceWebhookIdempotency({
            paymentId: subscriptionPayment.id,
            eventKey: `STRIPE:${event.id}`,
            metadata: subscriptionPayment.metadata,
          })
          if (idempotency.duplicate || subscriptionPayment.status === 'PAID') break
          assertPaymentStatusTransition(subscriptionPayment.status, 'PAID')
          await prisma.payment.update({
            where: { id: subscriptionPayment.id },
            data: {
              status: 'PAID',
              stripePaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
              metadata: JSON.stringify({
                checkoutSessionId: session.id,
                paymentIntentId: session.payment_intent,
                captureStatus: 'paid',
              }),
            },
          })
        }

        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
        if (!plan) break

        const now = new Date()
        const periodEnd = new Date(now)
        if (billingCycle === 'YEARLY') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        else periodEnd.setMonth(periodEnd.getMonth() + 1)

        await prisma.subscription.upsert({
          where: { companyId },
          create: {
            companyId,
            planId,
            status: 'ACTIVE',
            billingCycle: billingCycle || 'MONTHLY',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            stripeCustomerId: session.customer as string,
            stripeSubId: session.subscription as string,
          },
          update: {
            planId,
            status: 'ACTIVE',
            billingCycle: billingCycle || 'MONTHLY',
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
        await screenFraudEvent({
          req,
          actorUserId: owner?.userId || metadata.buyerId || '',
          userId: owner?.userId || metadata.buyerId || '',
          companyId,
          eventType: FraudEventType.PAYMENT_ACTIVITY,
          sourceModule: 'payments/stripe/webhook',
          title: 'Stripe subscription payment confirmed',
          summary: 'Stripe checkout completed for subscription activation.',
          payload: {
            kind: metadata.kind,
            companyId,
            planId,
            amount: session.amount_total,
            currency: session.currency,
          },
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as { subscription?: string; amount_paid?: number; currency?: string; id?: string }
        if (!invoice.subscription) break

        const existingInvoice = invoice.id
          ? await prisma.invoice.findFirst({
            where: { stripeInvoiceId: invoice.id },
            select: { id: true },
          })
          : null
        if (existingInvoice) break

        const sub = await prisma.subscription.findFirst({
          where: { stripeSubId: invoice.subscription as string },
          include: { plan: true },
        })
        if (!sub) break

        const now = new Date()
        const periodEnd = new Date(now)
        if (sub.billingCycle === 'YEARLY') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        else periodEnd.setMonth(periodEnd.getMonth() + 1)

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
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        })
        if (owner) {
          const existingPayment = invoice.id
            ? await prisma.payment.findFirst({
              where: { stripePaymentId: invoice.id },
              select: { id: true },
            })
            : null
          if (existingPayment) break

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

          const company = await prisma.company.findUnique({
            where: { id: sub.companyId },
            select: { name: true },
          })

          try {
            await sendInvoicePaidEmail({
              to: owner.user.email,
              customerName: `${owner.user.firstName} ${owner.user.lastName}`.trim(),
              companyName: company?.name || 'Your company',
              invoiceNumber,
              amount,
              currency: dbInvoice.currency,
              planName: sub.plan.name,
              paymentMethod: 'Stripe',
              paidAt: dbInvoice.paidAt || now,
              dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/packages`,
            })
          } catch (error) {
            console.error('Stripe invoice email failed:', error)
          }
        }
        await screenFraudEvent({
          req,
          actorUserId: owner?.userId || '',
          userId: owner?.userId || '',
          companyId: sub.companyId,
          eventType: FraudEventType.PAYMENT_ACTIVITY,
          sourceModule: 'payments/stripe/webhook',
          title: 'Stripe invoice paid',
          summary: 'Recurring Stripe invoice payment succeeded.',
          payload: {
            subscriptionId: sub.id,
            invoiceId: dbInvoice.id,
            amount,
            currency: dbInvoice.currency,
          },
        })
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
        await screenFraudEvent({
          req,
          actorUserId: owner?.userId || '',
          userId: owner?.userId || '',
          companyId: sub.companyId,
          eventType: FraudEventType.PAYMENT_ACTIVITY,
          sourceModule: 'payments/stripe/webhook',
          title: 'Stripe payment failed',
          summary: 'Recurring Stripe invoice payment failed.',
          payload: {
            subscriptionId: sub.id,
          },
        })
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
    await logPaymentWebhookFailureEvent({
      provider: 'STRIPE',
      message: 'Stripe webhook processing failed.',
      reason: err instanceof Error ? err.message : 'unknown_error',
    })
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
