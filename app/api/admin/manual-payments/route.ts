import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { sendInvoicePaidEmail } from '@/lib/email'
import { createNotification } from '@/server/services/notification'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'

const reviewSchema = z.object({
  requestId: z.string(),
  status: z.enum(['PAID', 'FAILED', 'CANCELLED']),
  reviewNotes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const status = searchParams.get('status') || undefined

    const where = status ? { status: status as 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' } : {}
    const [items, total] = await Promise.all([
      prisma.manualPaymentRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.manualPaymentRequest.count({ where }),
    ])

    const enriched = await Promise.all(
      items.map(async (item) => {
        const [company, plan] = await Promise.all([
          prisma.company.findUnique({ where: { id: item.companyId }, select: { id: true, name: true } }),
          prisma.subscriptionPlan.findUnique({ where: { id: item.planId }, select: { id: true, name: true } }),
        ])
        return { ...item, company, plan }
      })
    )

    return successResponse(enriched, 'Manual payment requests fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = reviewSchema.parse(await req.json())

    const request = await prisma.manualPaymentRequest.findUnique({
      where: { id: data.requestId },
    })
    if (!request) throw new ApiError(404, 'Manual payment request not found')

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: request.planId } })
    if (!plan) throw new ApiError(404, 'Subscription plan not found')

    const company = await prisma.company.findUnique({ where: { id: request.companyId }, select: { id: true, name: true } })
    if (!company) throw new ApiError(404, 'Company not found')

    const owner = await prisma.companyUser.findFirst({
      where: { companyId: request.companyId, isPrimary: true },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    })
    if (!owner) throw new ApiError(404, 'Company owner not found')

    const updatedRequest = await prisma.manualPaymentRequest.update({
      where: { id: request.id },
      data: {
        status: data.status,
        reviewedAt: new Date(),
        reviewedBy: admin.userId,
        reviewNotes: data.reviewNotes,
      },
    })

    if (data.status !== 'PAID') {
      await createNotification({
        userId: owner.userId,
        type: 'PAYMENT_FAILED',
        title: 'Manual Payment Review Updated',
        message: data.reviewNotes || `Your manual payment request is now ${data.status.toLowerCase()}.`,
        data: { manualPaymentRequestId: updatedRequest.id, status: updatedRequest.status },
      })

      return successResponse(updatedRequest, 'Manual payment request updated')
    }

    const inferredBillingCycle =
      Number(request.amount) === Number(plan.yearlyPrice) ? 'YEARLY' : 'MONTHLY'

    const now = new Date()
    const periodEnd = new Date(now)
    if (inferredBillingCycle === 'YEARLY') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    else periodEnd.setMonth(periodEnd.getMonth() + 1)

    const subscription = await prisma.subscription.upsert({
      where: { companyId: request.companyId },
      create: {
        companyId: request.companyId,
        planId: request.planId,
        status: 'ACTIVE',
        billingCycle: inferredBillingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId: request.planId,
        status: 'ACTIVE',
        billingCycle: inferredBillingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    })

    await prisma.company.update({
      where: { id: request.companyId },
      data: {
        isPremium: plan.featuredCompany,
        isFeatured: plan.featuredCompany,
      },
    })

    const invoice = await prisma.invoice.create({
      data: {
        subscriptionId: subscription.id,
        invoiceNumber: `INV-${Date.now()}`,
        amount: request.amount,
        total: request.amount,
        currency: request.currency,
        status: 'PAID',
        dueDate: now,
        paidAt: now,
        notes: data.reviewNotes || `Manual payment approved by admin.`,
      },
    })

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        userId: owner.userId,
        amount: request.amount,
        currency: request.currency,
        method: 'MANUAL',
        status: 'PAID',
        transactionId: request.transferRef || request.id,
        metadata: JSON.stringify({
          kind: 'SUBSCRIPTION',
          manualPaymentRequestId: request.id,
          reviewedBy: admin.userId,
        }),
      },
    })

    await createNotification({
      userId: owner.userId,
      type: 'PAYMENT_SUCCESS',
      title: 'Subscription Activated',
      message: `Your ${plan.name} subscription has been activated after manual payment verification.`,
      data: { invoiceId: invoice.id, subscriptionId: subscription.id },
    })

    try {
      await sendInvoicePaidEmail({
        to: owner.user.email,
        customerName: `${owner.user.firstName} ${owner.user.lastName}`.trim(),
        companyName: company.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.total),
        currency: invoice.currency,
        planName: plan.name,
        paymentMethod: 'MANUAL',
        paidAt: invoice.paidAt || now,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
      })
    } catch (error) {
      console.error('Manual payment invoice email failed:', error)
    }

    return successResponse(updatedRequest, 'Manual payment approved and subscription activated')
  } catch (error) {
    return handleApiError(error)
  }
}
