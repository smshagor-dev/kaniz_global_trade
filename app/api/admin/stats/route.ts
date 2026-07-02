import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { successResponse, handleApiError } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const now    = new Date()
    const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const month  = new Date(now.getFullYear(), now.getMonth(), 1)
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      totalBuyers,
      totalSuppliers,
      totalCompanies,
      totalProducts,
      pendingProducts,
      pendingVerification,
      totalRFQs,
      totalInquiries,
      pendingReports,
      activeSubscriptions,
      newUsersToday,
      newCompaniesMonth,
      revenueMonth,
      pendingKyc,
      openFraudAlerts,
      inspectionReports,
      tradeOrders,
      sampleOrders,
      activeShipments,
      openInsuranceClaims,
      openFinancingRequests,
      commissionRevenue,
      paidInvoicesMonth,
      pendingManualPayments,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.userRole.count({ where: { role: { name: 'BUYER' } } }),
      prisma.userRole.count({ where: { role: { name: 'SUPPLIER_OWNER' } } }),
      prisma.company.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { status: 'PENDING', deletedAt: null } }),
      prisma.companyVerification.count({ where: { status: 'DOCUMENT_SUBMITTED' } }),
      prisma.rFQ.count({ where: { deletedAt: null } }),
      prisma.inquiry.count({ where: { deletedAt: null } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
      prisma.company.count({ where: { createdAt: { gte: month }, deletedAt: null } }),
      prisma.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: month } },
        _sum: { amount: true },
      }),
      prisma.kYCProfile.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.fraudAlert.count({ where: { status: { in: ['OPEN', 'INVESTIGATING', 'WATCHLIST'] } } }),
      prisma.inspectionReport.count(),
      prisma.tradeOrder.count(),
      prisma.sampleOrder.count(),
      prisma.shipment.count({ where: { status: { not: 'DELIVERED' } } }),
      prisma.insuranceClaim.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'APPROVED'] } } }),
      prisma.financingRequest.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] } } }),
      prisma.platformCommission.aggregate({
        where: { status: { in: ['ACCRUED', 'SETTLED'] }, recognizedAt: { gte: month } },
        _sum: { amount: true },
      }),
      prisma.invoice.count({ where: { status: 'PAID', createdAt: { gte: month } } }),
      prisma.manualPaymentRequest.count({ where: { status: 'PENDING' } }),
    ])

    // User growth (last 30 days)
    const userGrowth = await prisma.$queryRaw<{ date: string | Date; count: number | bigint }[]>`
      SELECT DATE(createdAt) as date, COUNT(*) as count
      FROM User
      WHERE createdAt >= ${last30} AND deletedAt IS NULL
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `

    // Revenue trend (last 12 months)
    const revenueTrend = await prisma.$queryRaw<{ month: string; revenue: number | bigint | null }[]>`
      SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, SUM(amount) as revenue
      FROM Payment
      WHERE status = 'PAID' AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month ASC
    `

    const billingByGateway = await prisma.payment.groupBy({
      by: ['method'],
      where: { status: 'PAID', createdAt: { gte: month } },
      _sum: { amount: true },
      _count: { id: true },
    })

    const recentInvoices = await prisma.invoice.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: {
            company: { select: { name: true } },
            plan: { select: { name: true } },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { method: true },
        },
      },
    })

    // Top categories by product count
    const topCategories = await prisma.category.findMany({
      take: 10,
      orderBy: { products: { _count: 'desc' } },
      select: {
        id: true,
        name: true,
        _count: { select: { products: true } },
      },
    })

    return successResponse({
      overview: {
        totalUsers,
        totalBuyers,
        totalSuppliers,
        totalCompanies,
        totalProducts,
        pendingProducts,
        pendingVerification,
        totalRFQs,
        totalInquiries,
        pendingReports,
        activeSubscriptions,
        newUsersToday,
        newCompaniesMonth,
        revenueMonth: Number(revenueMonth._sum.amount || 0),
        pendingKyc,
        openFraudAlerts,
        inspectionReports,
        tradeOrders,
        sampleOrders,
        activeShipments,
        openInsuranceClaims,
        openFinancingRequests,
        commissionRevenue: Number(commissionRevenue._sum.amount || 0),
        paidInvoicesMonth,
        pendingManualPayments,
      },
      charts: {
        userGrowth: userGrowth.map((item) => ({
          date: item.date instanceof Date ? item.date.toISOString() : String(item.date),
          count: Number(item.count || 0),
        })),
        revenueTrend: revenueTrend.map((item) => ({
          month: item.month,
          revenue: Number(item.revenue || 0),
        })),
        billingByGateway: billingByGateway.map((item) => ({
          method: item.method,
          amount: Number(item._sum.amount || 0),
          count: item._count.id,
        })),
        topCategories,
        recentInvoices: recentInvoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          total: Number(invoice.total),
          currency: invoice.currency,
          status: invoice.status,
          createdAt: invoice.createdAt,
          companyName: invoice.subscription.company.name,
          planName: invoice.subscription.plan.name,
          method: invoice.payments[0]?.method || 'N/A',
        })),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
