import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const companyId = authUser.companyId
    if (!companyId) throw new ApiError(403, 'Supplier company required')

    const days = Math.max(7, Math.min(90, Number(new URL(req.url).searchParams.get('days') || '30')))
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    from.setHours(0, 0, 0, 0)

    const [
      company,
      analytics,
      topProducts,
      inquirySummary,
      quotationStats,
      tradeOrderSummary,
      sampleOrderSummary,
      shipmentSummary,
      adSummary,
      financingSummary,
      insuranceSummary,
      commissions,
      notifications,
      unreadNotifications,
      recentTradeOrders,
      recentSampleOrders,
      recentPayments,
    ] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          verificationStatus: true,
          isFeatured: true,
          isPremium: true,
          totalViews: true,
          totalInquiries: true,
          creditProfile: { select: { score: true } },
          subscription: {
            include: {
              plan: { select: { id: true, name: true } },
            },
          },
          _count: {
            select: {
              products: { where: { deletedAt: null } },
              reviews: true,
            },
          },
        },
      }),
      prisma.companyAnalytic.findMany({
        where: { companyId, date: { gte: from } },
        orderBy: { date: 'asc' },
      }),
      prisma.product.findMany({
        where: { companyId, status: 'APPROVED', deletedAt: null },
        orderBy: [{ totalViews: 'desc' }, { totalInquiries: 'desc' }],
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          totalViews: true,
          totalInquiries: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      }),
      prisma.inquiry.groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: true,
      }),
      prisma.rFQQuotation.groupBy({
        by: ['status'],
        where: { companyId },
        _count: true,
      }),
      prisma.tradeOrder.groupBy({
        by: ['status'],
        where: { supplierCompanyId: companyId },
        _count: true,
      }),
      prisma.sampleOrder.groupBy({
        by: ['status'],
        where: { supplierCompanyId: companyId },
        _count: true,
      }),
      prisma.shipment.groupBy({
        by: ['status'],
        where: { supplierCompanyId: companyId },
        _count: true,
      }),
      prisma.adCampaign.groupBy({
        by: ['status'],
        where: { companyId },
        _count: true,
      }),
      prisma.financingRequest.groupBy({
        by: ['status'],
        where: { companyId },
        _count: true,
      }),
      prisma.insurancePolicy.groupBy({
        by: ['status'],
        where: { companyId },
        _count: true,
      }),
      prisma.platformCommission.findMany({
        where: { companyId },
        select: { amount: true, status: true, createdAt: true },
      }),
      prisma.notification.findMany({
        where: { userId: authUser.userId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          isRead: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { userId: authUser.userId, isRead: false },
      }),
      prisma.tradeOrder.findMany({
        where: { supplierCompanyId: companyId },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          productName: true,
          status: true,
          totalAmount: true,
          currencyCode: true,
          createdAt: true,
        },
      }),
      prisma.sampleOrder.findMany({
        where: { supplierCompanyId: companyId },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          title: true,
          status: true,
          totalAmount: true,
          currencyCode: true,
          createdAt: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          OR: [
            { invoice: { subscription: { companyId } } },
            { tradeOrder: { supplierCompanyId: companyId } },
            { sampleOrder: { supplierCompanyId: companyId } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          method: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          invoice: { select: { invoiceNumber: true } },
          tradeOrder: { select: { productName: true } },
          sampleOrder: { select: { title: true } },
        },
      }),
    ])

    const totals = analytics.reduce(
      (acc, day) => ({
        profileViews: acc.profileViews + day.profileViews,
        productViews: acc.productViews + day.productViews,
        inquiries: acc.inquiries + day.inquiries,
        rfqs: acc.rfqs + day.rfqs,
        messages: acc.messages + day.messages,
        quotations: acc.quotations + day.quotations,
      }),
      { profileViews: 0, productViews: 0, inquiries: 0, rfqs: 0, messages: 0, quotations: 0 }
    )

    const quotationAccepted = quotationStats.find((item) => item.status === 'ACCEPTED')?._count || 0
    const quotationTotal = quotationStats.reduce((sum, item) => sum + item._count, 0)
    const acceptanceRate = quotationTotal > 0 ? Math.round((quotationAccepted / quotationTotal) * 100) : 0

    const commissionTotals = commissions.reduce(
      (acc, item) => {
        const amount = Number(item.amount)
        acc.total += amount
        if (item.status === 'ACCRUED' || item.status === 'SETTLED') acc.recognized += amount
        return acc
      },
      { total: 0, recognized: 0 }
    )

    const portfolio = {
      activeTradeOrders: tradeOrderSummary
        .filter((item) => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(item.status))
        .reduce((sum, item) => sum + item._count, 0),
      activeSampleOrders: sampleOrderSummary
        .filter((item) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(item.status))
        .reduce((sum, item) => sum + item._count, 0),
      activeShipments: shipmentSummary
        .filter((item) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(item.status))
        .reduce((sum, item) => sum + item._count, 0),
      activeAds: adSummary
        .filter((item) => ['ACTIVE', 'PENDING_APPROVAL'].includes(item.status))
        .reduce((sum, item) => sum + item._count, 0),
      financingOpen: financingSummary
        .filter((item) => ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(item.status))
        .reduce((sum, item) => sum + item._count, 0),
      insuranceOpen: insuranceSummary
        .filter((item) => ['QUOTED', 'ACTIVE', 'CLAIM_OPEN'].includes(item.status))
        .reduce((sum, item) => sum + item._count, 0),
    }

    return successResponse({
      company,
      totals,
      acceptanceRate,
      unreadNotifications,
      commissionTotals,
      portfolio,
      charts: {
        traffic: analytics.map((item) => ({
          date: item.date,
          profileViews: item.profileViews,
          productViews: item.productViews,
          inquiries: item.inquiries,
          quotations: item.quotations,
          messages: item.messages,
        })),
        engagement: [
          { name: 'Profile Views', value: totals.profileViews },
          { name: 'Product Views', value: totals.productViews },
          { name: 'Inquiries', value: totals.inquiries },
          { name: 'RFQs', value: totals.rfqs },
          { name: 'Messages', value: totals.messages },
          { name: 'Quotations', value: totals.quotations },
        ],
        inquiryStatus: inquirySummary.map((item) => ({ name: item.status, value: item._count })),
        quotationStatus: quotationStats.map((item) => ({ name: item.status, value: item._count })),
        tradeOrders: tradeOrderSummary.map((item) => ({ name: item.status, value: item._count })),
        samples: sampleOrderSummary.map((item) => ({ name: item.status, value: item._count })),
      },
      topProducts,
      recent: {
        notifications,
        tradeOrders: recentTradeOrders.map((item) => ({
          ...item,
          totalAmount: Number(item.totalAmount),
        })),
        sampleOrders: recentSampleOrders.map((item) => ({
          ...item,
          totalAmount: Number(item.totalAmount),
        })),
        payments: recentPayments.map((item) => ({
          ...item,
          amount: Number(item.amount),
          label: item.invoice?.invoiceNumber || item.tradeOrder?.productName || item.sampleOrder?.title || 'Payment',
        })),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
