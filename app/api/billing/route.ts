import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth, ApiError } from '@/lib/permissions'
import { getSettingsMap } from '@/lib/settings/system'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)

    const companyUser = await prisma.companyUser.findFirst({
      where: { userId: authUser.userId, isPrimary: true },
      select: { companyId: true },
    })
    if (!companyUser) throw new ApiError(404, 'No company found for this user')

    const [company, subscription, plans, payments, manualRequests, settings] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyUser.companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          isPremium: true,
          isFeatured: true,
        },
      }),
      prisma.subscription.findUnique({
        where: { companyId: companyUser.companyId },
        include: {
          plan: true,
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              payments: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }],
      }),
      prisma.payment.findMany({
        where: {
          OR: [
            { userId: authUser.userId },
            { invoice: { subscription: { companyId: companyUser.companyId } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              subscription: {
                select: {
                  companyId: true,
                  plan: { select: { name: true } },
                },
              },
            },
          },
          tradeOrder: { select: { id: true, productName: true, status: true } },
          sampleOrder: { select: { id: true, title: true, status: true } },
        },
      }),
      prisma.manualPaymentRequest.findMany({
        where: { companyId: companyUser.companyId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      getSettingsMap([
        'STRIPE_ENABLED',
        'SSLCOMMERZ_ENABLED',
        'SSLCOMMERZ_SANDBOX_MODE',
        'AAMARPAY_ENABLED',
        'AAMARPAY_SANDBOX_MODE',
        'NOWPAYMENTS_ENABLED',
        'NOWPAYMENTS_SANDBOX_MODE',
        'PAYPAL_ENABLED',
        'PAYPAL_MODE',
      ]),
    ])

    return successResponse({
      company,
      subscription,
      plans,
      payments,
      manualRequests,
      paymentMethods: [
        { key: 'STRIPE', label: 'Stripe', enabled: settings.STRIPE_ENABLED === 'true', mode: 'live' },
        { key: 'SSLCOMMERZ', label: 'SSLCommerz', enabled: settings.SSLCOMMERZ_ENABLED === 'true', mode: settings.SSLCOMMERZ_SANDBOX_MODE === 'true' ? 'sandbox' : 'live' },
        { key: 'AAMARPAY', label: 'aamarPay', enabled: settings.AAMARPAY_ENABLED === 'true', mode: settings.AAMARPAY_SANDBOX_MODE === 'true' ? 'sandbox' : 'live' },
        { key: 'NOWPAYMENTS', label: 'NOWPayments', enabled: settings.NOWPAYMENTS_ENABLED === 'true', mode: settings.NOWPAYMENTS_SANDBOX_MODE === 'true' ? 'sandbox' : 'live' },
        { key: 'PAYPAL', label: 'PayPal', enabled: settings.PAYPAL_ENABLED === 'true', mode: settings.PAYPAL_MODE || 'sandbox' },
        { key: 'MANUAL', label: 'Manual Bank Transfer', enabled: true, mode: 'offline' },
      ],
    })
  } catch (error) {
    return handleApiError(error)
  }
}
