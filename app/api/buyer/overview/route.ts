import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth, ApiError, ROLES } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { buildDateBuckets, incrementBucket, mapStatusCounts, sumStatusCounts } from '@/lib/dashboard/live-overview'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (!authUser.roles.includes(ROLES.BUYER) && !authUser.roles.includes(ROLES.ADMIN) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new ApiError(403, 'Buyer access required')
    }

    const days = Math.max(7, Math.min(90, Number(new URL(req.url).searchParams.get('days') || '30')))
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    from.setHours(0, 0, 0, 0)

    const [
      user,
      tradeOrderSummary,
      sampleOrderSummary,
      shipmentSummary,
      logisticsSummary,
      insuranceSummary,
      claimSummary,
      rfqTotal,
      inquiryTotal,
      quotationTotal,
      tradeOrders,
      sampleOrders,
      inquiries,
      quotations,
      shipments,
      logisticsBookings,
      insurancePolicies,
      insuranceClaims,
      notifications,
      unreadNotifications,
      payments,
      recentTradeOrders,
      recentSampleOrders,
      recentShipments,
      recentLogistics,
      recentPolicies,
      recentClaims,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: authUser.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          fraudPublicFlag: true,
          creditProfile: { select: { score: true } },
          kycProfile: { select: { status: true } },
          b2bCompanyOwned: {
            select: {
              id: true,
              companyName: true,
              buyerVerificationStatus: true,
            },
          },
        },
      }),
      prisma.tradeOrder.groupBy({
        by: ['status'],
        where: { buyerId: authUser.userId },
        _count: true,
      }),
      prisma.sampleOrder.groupBy({
        by: ['status'],
        where: { buyerId: authUser.userId },
        _count: true,
      }),
      prisma.shipment.groupBy({
        by: ['status'],
        where: { buyerId: authUser.userId },
        _count: true,
      }),
      prisma.logisticsBooking.groupBy({
        by: ['status'],
        where: { buyerId: authUser.userId },
        _count: true,
      }),
      prisma.insurancePolicy.groupBy({
        by: ['status'],
        where: { buyerId: authUser.userId },
        _count: true,
      }),
      prisma.insuranceClaim.groupBy({
        by: ['status'],
        where: { buyerId: authUser.userId },
        _count: true,
      }),
      prisma.rFQ.count({
        where: { buyerId: authUser.userId, deletedAt: null },
      }),
      prisma.inquiry.count({
        where: { buyerId: authUser.userId, deletedAt: null },
      }),
      prisma.rFQQuotation.count({
        where: { buyerId: authUser.userId },
      }),
      prisma.tradeOrder.findMany({
        where: { buyerId: authUser.userId, createdAt: { gte: from } },
        select: { createdAt: true, totalAmount: true, status: true },
      }),
      prisma.sampleOrder.findMany({
        where: { buyerId: authUser.userId, createdAt: { gte: from } },
        select: { createdAt: true, totalAmount: true, status: true },
      }),
      prisma.inquiry.findMany({
        where: { buyerId: authUser.userId, deletedAt: null, createdAt: { gte: from } },
        select: { createdAt: true, status: true },
      }),
      prisma.rFQQuotation.findMany({
        where: { buyerId: authUser.userId, createdAt: { gte: from } },
        select: { createdAt: true, status: true, totalPrice: true },
      }),
      prisma.shipment.findMany({
        where: { buyerId: authUser.userId, createdAt: { gte: from } },
        select: { createdAt: true, status: true },
      }),
      prisma.logisticsBooking.findMany({
        where: { buyerId: authUser.userId, createdAt: { gte: from } },
        select: { createdAt: true, status: true, finalCost: true, quotedCost: true },
      }),
      prisma.insurancePolicy.findMany({
        where: { buyerId: authUser.userId, createdAt: { gte: from } },
        select: { createdAt: true, status: true, insuredAmount: true, premiumAmount: true },
      }),
      prisma.insuranceClaim.findMany({
        where: { buyerId: authUser.userId, createdAt: { gte: from } },
        select: { createdAt: true, status: true, claimAmount: true },
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
      prisma.payment.findMany({
        where: {
          OR: [
            { tradeOrder: { buyerId: authUser.userId } },
            { sampleOrder: { buyerId: authUser.userId } },
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
          tradeOrder: { select: { productName: true } },
          sampleOrder: { select: { title: true } },
        },
      }),
      prisma.tradeOrder.findMany({
        where: { buyerId: authUser.userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          productName: true,
          status: true,
          totalAmount: true,
          currencyCode: true,
          createdAt: true,
          supplierCompany: { select: { name: true, slug: true } },
          escrowAccount: { select: { status: true } },
        },
      }),
      prisma.sampleOrder.findMany({
        where: { buyerId: authUser.userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          totalAmount: true,
          currencyCode: true,
          createdAt: true,
          supplierCompany: { select: { name: true, slug: true } },
        },
      }),
      prisma.shipment.findMany({
        where: { buyerId: authUser.userId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          carrier: true,
          trackingNumber: true,
          trackingUrl: true,
          status: true,
          lastEvent: true,
          lastLocation: true,
          estimatedDeliveryAt: true,
          lastSyncedAt: true,
          tradeOrder: { select: { productName: true } },
          sampleOrder: { select: { title: true } },
        },
      }),
      prisma.logisticsBooking.findMany({
        where: { buyerId: authUser.userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          providerName: true,
          serviceMode: true,
          origin: true,
          destination: true,
          status: true,
          trackingNumber: true,
          estimatedDeliveryAt: true,
          updatedAt: true,
        },
      }),
      prisma.insurancePolicy.findMany({
        where: { buyerId: authUser.userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          providerName: true,
          policyType: true,
          status: true,
          insuredAmount: true,
          premiumAmount: true,
          currencyCode: true,
          endsAt: true,
          updatedAt: true,
        },
      }),
      prisma.insuranceClaim.findMany({
        where: { buyerId: authUser.userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          claimAmount: true,
          currencyCode: true,
          updatedAt: true,
          policy: { select: { providerName: true, policyType: true } },
        },
      }),
    ])

    if (!user) throw new ApiError(404, 'Buyer profile not found')

    const activity = buildDateBuckets(days, {
      tradeOrders: 0,
      sampleOrders: 0,
      inquiries: 0,
      quotations: 0,
      shipments: 0,
      logistics: 0,
    })
    const spend = buildDateBuckets(days, {
      tradeSpend: 0,
      sampleSpend: 0,
      insuredValue: 0,
      claimValue: 0,
    })

    tradeOrders.forEach((item) => {
      incrementBucket(activity, item.createdAt, 'tradeOrders')
      incrementBucket(spend, item.createdAt, 'tradeSpend', Number(item.totalAmount))
    })
    sampleOrders.forEach((item) => {
      incrementBucket(activity, item.createdAt, 'sampleOrders')
      incrementBucket(spend, item.createdAt, 'sampleSpend', Number(item.totalAmount))
    })
    inquiries.forEach((item) => incrementBucket(activity, item.createdAt, 'inquiries'))
    quotations.forEach((item) => incrementBucket(activity, item.createdAt, 'quotations'))
    shipments.forEach((item) => incrementBucket(activity, item.createdAt, 'shipments'))
    logisticsBookings.forEach((item) => incrementBucket(activity, item.createdAt, 'logistics'))
    insurancePolicies.forEach((item) => incrementBucket(spend, item.createdAt, 'insuredValue', Number(item.insuredAmount)))
    insuranceClaims.forEach((item) => incrementBucket(spend, item.createdAt, 'claimValue', Number(item.claimAmount)))

    const tradeSpendTotal = tradeOrders.reduce((sum, item) => sum + Number(item.totalAmount), 0)
    const sampleSpendTotal = sampleOrders.reduce((sum, item) => sum + Number(item.totalAmount), 0)
    const protectedValue = insurancePolicies.reduce((sum, item) => sum + Number(item.insuredAmount), 0)
    const openClaimValue = insuranceClaims
      .filter((item) => ['OPEN', 'UNDER_REVIEW'].includes(item.status))
      .reduce((sum, item) => sum + Number(item.claimAmount), 0)
    const completedTradeOrders = tradeOrderSummary
      .filter((item) => item.status === 'COMPLETED')
      .reduce((sum, item) => sum + item._count, 0)
    const averageOrderValue = completedTradeOrders > 0 ? tradeSpendTotal / completedTradeOrders : 0

    return successResponse({
      generatedAt: new Date().toISOString(),
      buyer: {
        ...user,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
      },
      totals: {
        tradeOrders: tradeOrderSummary.reduce((sum, item) => sum + item._count, 0),
        sampleOrders: sampleOrderSummary.reduce((sum, item) => sum + item._count, 0),
        rfqs: rfqTotal,
        inquiries: inquiryTotal,
        quotations: quotationTotal,
        shipments: shipmentSummary.reduce((sum, item) => sum + item._count, 0),
        logistics: logisticsSummary.reduce((sum, item) => sum + item._count, 0),
        insurancePolicies: insuranceSummary.reduce((sum, item) => sum + item._count, 0),
        claims: claimSummary.reduce((sum, item) => sum + item._count, 0),
      },
      portfolio: {
        activeTradeOrders: sumStatusCounts(tradeOrderSummary, ['COMPLETED', 'CANCELLED', 'REFUNDED']),
        activeSampleOrders: sumStatusCounts(sampleOrderSummary, ['COMPLETED', 'CANCELLED', 'REJECTED']),
        inTransitShipments: sumStatusCounts(shipmentSummary, ['DELIVERED', 'CANCELLED', 'RETURNED']) + sumStatusCounts(logisticsSummary, ['DELIVERED', 'CANCELLED']),
        pendingInsurance: sumStatusCounts(insuranceSummary, ['EXPIRED', 'CANCELLED']) + sumStatusCounts(claimSummary, ['SETTLED', 'REJECTED']),
        unreadNotifications,
      },
      financials: {
        tradeSpendTotal,
        sampleSpendTotal,
        protectedValue,
        openClaimValue,
        averageOrderValue,
      },
      charts: {
        activity,
        spend,
        tradeOrders: mapStatusCounts(tradeOrderSummary),
        samples: mapStatusCounts(sampleOrderSummary),
        logistics: mapStatusCounts(logisticsSummary),
        insurance: mapStatusCounts(insuranceSummary),
        claims: mapStatusCounts(claimSummary),
      },
      recent: {
        notifications,
        payments: payments.map((item) => ({
          ...item,
          amount: Number(item.amount),
          label: item.tradeOrder?.productName || item.sampleOrder?.title || 'Payment',
        })),
        tradeOrders: recentTradeOrders.map((item) => ({
          ...item,
          totalAmount: Number(item.totalAmount),
        })),
        sampleOrders: recentSampleOrders.map((item) => ({
          ...item,
          totalAmount: Number(item.totalAmount),
        })),
        shipments: recentShipments,
        logistics: recentLogistics.map((item) => ({
          ...item,
          statusLabel: `${item.providerName} ${item.serviceMode}`,
        })),
        insurancePolicies: recentPolicies.map((item) => ({
          ...item,
          insuredAmount: Number(item.insuredAmount),
          premiumAmount: Number(item.premiumAmount),
        })),
        claims: recentClaims.map((item) => ({
          ...item,
          claimAmount: Number(item.claimAmount),
        })),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
