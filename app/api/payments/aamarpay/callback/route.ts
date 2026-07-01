import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { sendInvoicePaidEmail } from '@/lib/email'
import { createNotification } from '@/server/services/notification'
import { searchAamarPayTransaction } from '@/lib/payment/aamarpay'
import { failAdCampaignPayment, finalizeAdCampaignPayment, getAdPaymentReturnUrl } from '@/lib/advertising/payment'

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
  if (kind === 'AD_CAMPAIGN') return getAdPaymentReturnUrl(status, 'aamarpay')
  if (kind === 'TRADE_ORDER') return `/buyer/trade-orders?payment=${status}&gateway=aamarpay`
  if (kind === 'SUBSCRIPTION') return `/payment-return/packages?payment=${status}&gateway=aamarpay`
  return `/buyer/sample-orders?payment=${status}&gateway=aamarpay`
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
      failureReason: payload.reason || payload.pay_status || payload.status_code || status,
      metadata: JSON.stringify({
        ...payload,
        callbackStatus: payload.pay_status || status,
      }),
    },
  })
}

async function finalizeSampleOrder(paymentId: string, sampleOrderId: string, payload: CallbackPayload) {
  const sampleOrder = await prisma.sampleOrder.findUnique({ where: { id: sampleOrderId } })
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

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) return

  const invoice = await prisma.invoice.create({
    data: {
      subscriptionId: subscription.id,
      invoiceNumber: `INV-${Date.now()}`,
      amount: payment.amount,
      total: payment.amount,
      currency: payment.currency,
      status: 'PAID',
      dueDate: now,
      paidAt: now,
      notes: `Paid via aamarPay. Transaction: ${payload.pg_txnid || payload.mer_txnid || ''}`.trim(),
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
        paymentMethod: 'aamarPay',
        paidAt: invoice.paidAt || now,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/packages`,
      })
    } catch (error) {
      console.error('aamarPay invoice email failed:', error)
    }
  }
}

async function processCallback(req: NextRequest) {
  const payload = await readPayload(req)
  const transactionId = payload.mer_txnid
  if (!transactionId) {
    return NextResponse.json({ success: false, message: 'mer_txnid missing' }, { status: 400 })
  }

  const payment = await prisma.payment.findFirst({
    where: { transactionId },
  })
  if (!payment) {
    return NextResponse.json({ success: false, message: 'Payment not found' }, { status: 404 })
  }

  const metadata = parseMetadata(payment.metadata)
  const statusCode = String(payload.status_code || '')
  const payStatus = String(payload.pay_status || '').toLowerCase()
  let redirectStatus: 'success' | 'failed' | 'cancelled' =
    statusCode === '2' || payStatus === 'successful'
      ? 'success'
      : statusCode === '7' || payStatus === 'failed' || payStatus === 'expired'
        ? 'failed'
        : 'cancelled'

  if (payment.status === 'PAID') {
    if (isBrowserCallback(req)) {
      const path = metadata.kind === 'AD_CAMPAIGN'
        ? getAdPaymentReturnUrl('success', 'aamarpay', metadata.adCampaignId)
        : getRedirectPath(metadata.kind, 'success')
      return NextResponse.redirect(new URL(path, req.url), { status: 303 })
    }
    return NextResponse.json({ success: true, alreadyProcessed: true })
  }

  if (statusCode !== '2' || payStatus !== 'successful') {
    if (metadata.kind === 'AD_CAMPAIGN') {
      await failAdCampaignPayment(
        payment.id,
        payload.reason || payload.pay_status || payload.status_code || 'aamarPay payment failed',
        payload,
        statusCode === '7' ? 'FAILED' : 'CANCELLED'
      )
    } else {
      await markPaymentAsFailed(payment.id, statusCode === '7' ? 'FAILED' : 'CANCELLED', payload)
    }
  } else {
    const transaction = await searchAamarPayTransaction(transactionId)
    const transactionStatusCode = String(transaction.status_code || '')
    const transactionPayStatus = String(transaction.pay_status || '').toLowerCase()
    const expectedAmount = Number(payment.amount).toFixed(2)
    const paidAmount = Number(transaction.amount || payload.amount || 0).toFixed(2)
    const merchantCurrency = String(transaction.currency_merchant || payment.currency).toUpperCase()

    if (transactionStatusCode !== '2' || transactionPayStatus !== 'successful') {
      const failurePayload = {
        ...payload,
        reason: `Search transaction status: ${transactionStatusCode || 'UNKNOWN'}`,
      }
      if (metadata.kind === 'AD_CAMPAIGN') await failAdCampaignPayment(payment.id, failurePayload.reason, failurePayload, 'FAILED')
      else await markPaymentAsFailed(payment.id, 'FAILED', failurePayload)
      redirectStatus = 'failed'
    } else if (expectedAmount !== paidAmount || merchantCurrency !== payment.currency.toUpperCase()) {
      const failurePayload = {
        ...payload,
        reason: `Amount or currency mismatch. Expected ${expectedAmount} ${payment.currency}, got ${paidAmount} ${merchantCurrency}`,
      }
      if (metadata.kind === 'AD_CAMPAIGN') await failAdCampaignPayment(payment.id, failurePayload.reason, failurePayload, 'FAILED')
      else await markPaymentAsFailed(payment.id, 'FAILED', failurePayload)
      redirectStatus = 'failed'
    } else {
      const mergedPayload = {
        ...payload,
        pg_txnid: String(transaction.pg_txnid || payload.pg_txnid || ''),
        bank_txn: String(transaction.bank_txn || payload.bank_txn || ''),
        card_type: String(transaction.card_type || payload.card_type || ''),
        pay_status: String(transaction.pay_status || payload.pay_status || ''),
        status_code: String(transaction.status_code || payload.status_code || ''),
      }

      if (metadata.kind === 'AD_CAMPAIGN') {
        await finalizeAdCampaignPayment(payment.id, mergedPayload, 'AAMARPAY')
      } else if (metadata.kind === 'TRADE_ORDER' && payment.tradeOrderId) {
        await finalizeTradeOrder(payment.id, payment.tradeOrderId, mergedPayload)
      } else if (metadata.kind === 'SUBSCRIPTION') {
        await finalizeSubscription(payment.id, mergedPayload, metadata)
      } else if (payment.sampleOrderId) {
        await finalizeSampleOrder(payment.id, payment.sampleOrderId, mergedPayload)
      }
      redirectStatus = 'success'
    }
  }

  if (isBrowserCallback(req)) {
    const path = metadata.kind === 'AD_CAMPAIGN'
      ? getAdPaymentReturnUrl(redirectStatus, 'aamarpay', metadata.adCampaignId)
      : getRedirectPath(metadata.kind, redirectStatus)
    return NextResponse.redirect(new URL(path, req.url), { status: 303 })
  }

  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest) {
  try {
    return await processCallback(req)
  } catch (error) {
    console.error('aamarPay callback error:', error)
    return NextResponse.json({ success: false, message: 'aamarPay callback failed' }, { status: 500 })
  }
}
