import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { sendInvoicePaidEmail } from '@/lib/email'
import { createNotification } from '@/server/services/notification'
import { validateSSLCommerzPayment } from '@/lib/payment/sslcommerz'
import { failAdCampaignPayment, finalizeAdCampaignPayment, getAdPaymentReturnUrl } from '@/lib/advertising/payment'
import { FraudEventType } from '@prisma/client'
import { screenFraudEvent } from '@/lib/fraud/service'
import { assertPaymentStatusTransition, enforceWebhookIdempotency } from '@/lib/payment/safety'
import { logPaymentWebhookFailureEvent } from '@/lib/monitoring/event-helpers'

type CallbackPayload = Record<string, string>

function parseMetadata(value: string | null | undefined): Record<string, string> {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, string>
  } catch {
    return {}
  }
}

function getRedirectPath(kind: string | undefined, status: 'success' | 'failed' | 'cancelled') {
  if (kind === 'AD_CAMPAIGN') return getAdPaymentReturnUrl(status, 'sslcommerz')
  if (kind === 'TRADE_ORDER') return `/buyer/trade-orders?payment=${status}&gateway=sslcommerz`
  if (kind === 'SUBSCRIPTION') return `/payment-return/packages?payment=${status}&gateway=sslcommerz`
  return `/buyer/sample-orders?payment=${status}&gateway=sslcommerz`
}

function isBrowserCallback(req: NextRequest) {
  const accept = req.headers.get('accept') || ''
  return accept.includes('text/html')
}

async function readPayload(req: NextRequest): Promise<CallbackPayload> {
  const formData = await req.formData()
  return Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, String(value)])
  )
}

async function markPaymentAsFailed(
  paymentId: string,
  status: 'FAILED' | 'CANCELLED',
  payload: CallbackPayload
) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status,
      failureReason: payload.failedreason || payload.error || payload.status || status,
      metadata: JSON.stringify({
        ...payload,
        callbackStatus: payload.status || status,
      }),
    },
  })
}

async function finalizeSampleOrder(paymentId: string, sampleOrderId: string, payload: CallbackPayload) {
  const sampleOrder = await prisma.sampleOrder.findUnique({
    where: { id: sampleOrderId },
  })
  if (!sampleOrder) return

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        metadata: JSON.stringify({
          ...payload,
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
}

async function finalizeTradeOrder(paymentId: string, tradeOrderId: string, payload: CallbackPayload) {
  const order = await prisma.tradeOrder.findUnique({
    where: { id: tradeOrderId },
    include: {
      escrowAccount: true,
      supplierCompany: {
        include: { companyUsers: { where: { isPrimary: true }, select: { userId: true } } },
      },
    },
  })
  if (!order?.escrowAccount) return

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        metadata: JSON.stringify({
          ...payload,
          captureStatus: 'paid',
        }),
      },
    }),
    prisma.escrowAccount.update({
      where: { id: order.escrowAccount.id },
      data: {
        paymentId,
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
        paymentId,
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
}

async function finalizeSubscription(paymentId: string, payload: CallbackPayload, metadata: Record<string, string>) {
  const { companyId, planId, billingCycle } = metadata
  if (!companyId || !planId) return

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
  if (!plan) return

  const now = new Date()
  const periodEnd = new Date(now)
  if (billingCycle === 'YEARLY') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  else periodEnd.setMonth(periodEnd.getMonth() + 1)

  const subscription = await prisma.subscription.upsert({
    where: { companyId },
    create: {
      companyId,
      planId,
      status: 'ACTIVE',
      billingCycle: billingCycle || 'MONTHLY',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      planId,
      status: 'ACTIVE',
      billingCycle: billingCycle || 'MONTHLY',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  })

  await prisma.company.update({
    where: { id: companyId },
    data: {
      isPremium: plan.featuredCompany,
      isFeatured: plan.featuredCompany,
    },
  })

  const invoiceNumber = `INV-${Date.now()}`
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) return

  const invoice = await prisma.invoice.create({
    data: {
      subscriptionId: subscription.id,
      invoiceNumber,
      amount: payment.amount,
      total: payment.amount,
      currency: payment.currency,
      status: 'PAID',
      dueDate: now,
      paidAt: now,
      notes: `Paid via SSLCommerz. Transaction: ${payload.bank_tran_id || payload.tran_id || ''}`.trim(),
    },
  })

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      invoiceId: invoice.id,
      status: 'PAID',
      metadata: JSON.stringify({
        ...payload,
        captureStatus: 'paid',
      }),
    },
  })

  const owner = await prisma.companyUser.findFirst({
    where: { companyId, isPrimary: true },
    include: {
      user: {
        select: { email: true, firstName: true, lastName: true },
      },
    },
  })
  if (owner) {
    await createNotification({
      userId: owner.userId,
      type: 'PAYMENT_SUCCESS',
      title: 'Subscription Activated',
      message: `Your ${plan.name} subscription is now active.`,
      data: { planId, invoiceId: invoice.id },
    })

    try {
      await sendInvoicePaidEmail({
        to: owner.user.email,
        customerName: `${owner.user.firstName} ${owner.user.lastName}`.trim(),
        companyName: (await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }))?.name || 'Your company',
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.total),
        currency: invoice.currency,
        planName: plan.name,
        paymentMethod: 'SSLCommerz',
        paidAt: invoice.paidAt || now,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/packages`,
      })
    } catch (error) {
      console.error('SSLCommerz invoice email failed:', error)
    }
  }
}

async function processCallback(req: NextRequest) {
  const payload = await readPayload(req)
  const transactionId = payload.tran_id
  if (!transactionId) {
    return NextResponse.json({ success: false, message: 'tran_id missing' }, { status: 400 })
  }

  const payment = await prisma.payment.findFirst({
    where: { transactionId },
  })
  if (!payment) {
    return NextResponse.json({ success: false, message: 'Payment not found' }, { status: 404 })
  }

  const metadata = parseMetadata(payment.metadata)
  const callbackStatus = (payload.status || '').toUpperCase()
  let redirectStatus: 'success' | 'failed' | 'cancelled' =
    callbackStatus === 'FAILED'
      ? 'failed'
      : callbackStatus === 'CANCELLED' || callbackStatus === 'CANCEL'
        ? 'cancelled'
        : 'success'

  if (payment.status === 'PAID') {
    if (isBrowserCallback(req)) {
      const path = metadata.kind === 'AD_CAMPAIGN'
        ? getAdPaymentReturnUrl('success', 'sslcommerz', metadata.adCampaignId)
        : getRedirectPath(metadata.kind, 'success')
      return NextResponse.redirect(new URL(path, req.url), { status: 303 })
    }
    return NextResponse.json({ success: true, alreadyProcessed: true })
  }

  const eventKey = `SSLCOMMERZ:${String(payload.val_id || payload.bank_tran_id || payload.tran_id)}:${callbackStatus || 'UNKNOWN'}`
  const idempotency = await enforceWebhookIdempotency({
    paymentId: payment.id,
    eventKey,
    metadata: payment.metadata,
  })

  if (idempotency.duplicate) {
    if (isBrowserCallback(req)) {
      const path = metadata.kind === 'AD_CAMPAIGN'
        ? getAdPaymentReturnUrl('success', 'sslcommerz', metadata.adCampaignId)
        : getRedirectPath(metadata.kind, 'success')
      return NextResponse.redirect(new URL(path, req.url), { status: 303 })
    }
    return NextResponse.json({ success: true, alreadyProcessed: true })
  }

  if (callbackStatus === 'FAILED') {
    assertPaymentStatusTransition(payment.status, 'FAILED')
    if (metadata.kind === 'AD_CAMPAIGN') {
      await failAdCampaignPayment(payment.id, payload.failedreason || payload.error || payload.status || 'SSLCommerz payment failed', payload, 'FAILED')
    } else {
      await markPaymentAsFailed(payment.id, 'FAILED', payload)
    }
    await screenFraudEvent({
      req,
      actorUserId: payment.userId,
      userId: payment.userId,
      companyId: metadata.supplierCompanyId || metadata.companyId,
      eventType: FraudEventType.PAYMENT_ACTIVITY,
      sourceModule: 'payments/sslcommerz/callback',
      title: 'SSLCommerz payment failed',
      summary: payload.failedreason || payload.error || payload.status || 'Payment callback failure',
      payload: { transactionId, callbackStatus, kind: metadata.kind, amount: payment.amount.toString(), currency: payment.currency },
    })
  } else if (callbackStatus === 'CANCELLED' || callbackStatus === 'CANCEL') {
    assertPaymentStatusTransition(payment.status, 'CANCELLED')
    if (metadata.kind === 'AD_CAMPAIGN') {
      await failAdCampaignPayment(payment.id, payload.failedreason || payload.error || payload.status || 'SSLCommerz payment cancelled', payload, 'CANCELLED')
    } else {
      await markPaymentAsFailed(payment.id, 'CANCELLED', payload)
    }
    await screenFraudEvent({
      req,
      actorUserId: payment.userId,
      userId: payment.userId,
      companyId: metadata.supplierCompanyId || metadata.companyId,
      eventType: FraudEventType.PAYMENT_ACTIVITY,
      sourceModule: 'payments/sslcommerz/callback',
      title: 'SSLCommerz payment cancelled',
      summary: 'Payment callback returned cancelled status.',
      payload: { transactionId, callbackStatus, kind: metadata.kind, amount: payment.amount.toString(), currency: payment.currency },
    })
  } else {
    if (!payload.val_id) {
      return NextResponse.json({ success: false, message: 'val_id missing' }, { status: 400 })
    }

    const validation = await validateSSLCommerzPayment(payload.val_id)
    const validationStatus = String(validation.status || '').toUpperCase()
    const expectedAmount = Number(payment.amount).toFixed(2)
    const paidAmount = Number(validation.amount || validation.currency_amount || payload.amount || 0).toFixed(2)
    const paidCurrency = String(validation.currency_type || validation.currency || payload.currency || payment.currency).toUpperCase()

    if (!['VALID', 'VALIDATED'].includes(validationStatus)) {
      assertPaymentStatusTransition(payment.status, 'FAILED')
      const failurePayload = {
        ...payload,
        failedreason: `Validation status: ${validationStatus || 'UNKNOWN'}`,
      }
      if (metadata.kind === 'AD_CAMPAIGN') await failAdCampaignPayment(payment.id, failurePayload.failedreason, failurePayload, 'FAILED')
      else await markPaymentAsFailed(payment.id, 'FAILED', failurePayload)
      redirectStatus = 'failed'
    } else if (expectedAmount !== paidAmount || paidCurrency !== payment.currency.toUpperCase()) {
      assertPaymentStatusTransition(payment.status, 'FAILED')
      const failurePayload = {
        ...payload,
        failedreason: `Amount or currency mismatch. Expected ${expectedAmount} ${payment.currency}, got ${paidAmount} ${paidCurrency}`,
      }
      if (metadata.kind === 'AD_CAMPAIGN') await failAdCampaignPayment(payment.id, failurePayload.failedreason, failurePayload, 'FAILED')
      else await markPaymentAsFailed(payment.id, 'FAILED', failurePayload)
      redirectStatus = 'failed'
    } else {
      assertPaymentStatusTransition(payment.status, 'PAID')
      const mergedPayload = {
        ...payload,
        validated_status: validationStatus,
        bank_tran_id: String(validation.bank_tran_id || payload.bank_tran_id || ''),
        card_type: String(validation.card_type || payload.card_type || ''),
      }

      if (metadata.kind === 'AD_CAMPAIGN') {
        await finalizeAdCampaignPayment(payment.id, mergedPayload, 'SSLCOMMERZ')
      } else if (metadata.kind === 'TRADE_ORDER' && payment.tradeOrderId) {
        await finalizeTradeOrder(payment.id, payment.tradeOrderId, mergedPayload)
      } else if (metadata.kind === 'SUBSCRIPTION') {
        await finalizeSubscription(payment.id, mergedPayload, metadata)
      } else if (payment.sampleOrderId) {
        await finalizeSampleOrder(payment.id, payment.sampleOrderId, mergedPayload)
      }

      await screenFraudEvent({
        req,
        actorUserId: payment.userId,
        userId: payment.userId,
        companyId: metadata.supplierCompanyId || metadata.companyId,
        eventType: FraudEventType.PAYMENT_ACTIVITY,
        sourceModule: 'payments/sslcommerz/callback',
        title: 'SSLCommerz payment confirmed',
        summary: `Payment callback completed for ${metadata.kind || 'marketplace'} flow.`,
        payload: { transactionId, callbackStatus: validationStatus, kind: metadata.kind, amount: payment.amount.toString(), currency: payment.currency },
      })
      redirectStatus = 'success'
    }
  }

  if (isBrowserCallback(req)) {
    const path = metadata.kind === 'AD_CAMPAIGN'
      ? getAdPaymentReturnUrl(redirectStatus, 'sslcommerz', metadata.adCampaignId)
      : getRedirectPath(metadata.kind, redirectStatus)
    return NextResponse.redirect(new URL(path, req.url), { status: 303 })
  }

  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest) {
  try {
    return await processCallback(req)
  } catch (error) {
    await logPaymentWebhookFailureEvent({
      provider: 'SSLCOMMERZ',
      message: 'SSLCommerz callback processing failed.',
      reason: error instanceof Error ? error.message : 'unknown_error',
    })
    console.error('SSLCommerz callback error:', error)
    return NextResponse.json({ success: false, message: 'SSLCommerz callback failed' }, { status: 500 })
  }
}
