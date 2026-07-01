import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { createNotification } from '@/server/services/notification'
import { sendInvoicePaidEmail } from '@/lib/email'
import { NOWPaymentsIpnPayload, verifyNOWPaymentsIpnSignature } from '@/lib/payment/nowpayments'
import { failAdCampaignPayment, finalizeAdCampaignPayment } from '@/lib/advertising/payment'

function parseMetadata(value: string | null | undefined): Record<string, string> {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, string>
  } catch {
    return {}
  }
}

async function markPaymentAsFailed(paymentId: string, reason: string, payload: NOWPaymentsIpnPayload) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'FAILED',
      failureReason: reason,
      metadata: JSON.stringify({
        ...payload,
        callbackStatus: payload.payment_status || 'FAILED',
      }),
    },
  })
}

async function finalizeSampleOrder(paymentId: string, sampleOrderId: string, payload: NOWPaymentsIpnPayload) {
  const sampleOrder = await prisma.sampleOrder.findUnique({ where: { id: sampleOrderId } })
  if (!sampleOrder) return

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        metadata: JSON.stringify({ ...payload, captureStatus: 'paid' }),
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

async function finalizeTradeOrder(paymentId: string, tradeOrderId: string, payload: NOWPaymentsIpnPayload) {
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
        metadata: JSON.stringify({ ...payload, captureStatus: 'paid' }),
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

async function finalizeSubscription(paymentId: string, payload: NOWPaymentsIpnPayload, metadata: Record<string, string>) {
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

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } })

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
      notes: `Paid via NOWPayments. Payment ID: ${String(payload.payment_id || '')}`.trim(),
    },
  })

  const owner = await prisma.companyUser.findFirst({
    where: { companyId, isPrimary: true },
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
  })

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      invoiceId: invoice.id,
      status: 'PAID',
      metadata: JSON.stringify({ ...payload, captureStatus: 'paid' }),
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
        companyName: company?.name || 'Your company',
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.total),
        currency: invoice.currency,
        planName: plan.name,
        paymentMethod: 'NOWPayments',
        paidAt: invoice.paidAt || now,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/packages`,
      })
    } catch (error) {
      console.error('NOWPayments invoice email failed:', error)
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const isValid = await verifyNOWPaymentsIpnSignature(rawBody, req.headers.get('x-nowpayments-sig'))
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid NOWPayments signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody) as NOWPaymentsIpnPayload
    const orderId = String(payload.order_id || '')
    if (!orderId) {
      return NextResponse.json({ success: false, message: 'order_id missing' }, { status: 400 })
    }

    const payment = await prisma.payment.findFirst({ where: { transactionId: orderId } })
    if (!payment) {
      return NextResponse.json({ success: false, message: 'Payment not found' }, { status: 404 })
    }

    if (payment.status === 'PAID') {
      return NextResponse.json({ success: true, alreadyProcessed: true })
    }

    const status = String(payload.payment_status || '').toLowerCase()
    const metadata = parseMetadata(payment.metadata)

    if (status === 'finished' || status === 'confirmed' || status === 'sending') {
      if (metadata.kind === 'AD_CAMPAIGN') {
        await finalizeAdCampaignPayment(payment.id, payload, 'NOWPAYMENTS')
      } else if (metadata.kind === 'TRADE_ORDER' && payment.tradeOrderId) {
        await finalizeTradeOrder(payment.id, payment.tradeOrderId, payload)
      } else if (metadata.kind === 'SUBSCRIPTION') {
        await finalizeSubscription(payment.id, payload, metadata)
      } else if (payment.sampleOrderId) {
        await finalizeSampleOrder(payment.id, payment.sampleOrderId, payload)
      }
      return NextResponse.json({ success: true })
    }

    if (['failed', 'refunded', 'expired'].includes(status)) {
      if (metadata.kind === 'AD_CAMPAIGN') {
        await failAdCampaignPayment(payment.id, `NOWPayments status: ${status}`, payload, 'FAILED')
      } else {
        await markPaymentAsFailed(payment.id, `NOWPayments status: ${status}`, payload)
      }
      return NextResponse.json({ success: true })
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadata: JSON.stringify({
          ...payload,
          callbackStatus: status || 'waiting',
        }),
      },
    })

    return NextResponse.json({ success: true, pending: true })
  } catch (error) {
    console.error('NOWPayments callback error:', error)
    return NextResponse.json({ success: false, message: 'NOWPayments callback failed' }, { status: 500 })
  }
}
