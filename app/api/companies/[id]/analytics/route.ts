import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireCompanyAccess } from '@/lib/permissions'
import { successResponse, handleApiError } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) {
      const { ApiError } = await import('@/lib/permissions')
      throw new ApiError(400, 'companyId required')
    }

    await requireCompanyAccess(req, companyId)

    const days   = parseInt(searchParams.get('days') || '30')
    const from   = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    from.setHours(0, 0, 0, 0)

    const [
      analytics,
      topProducts,
      inquirySummary,
      quotationStats,
      company,
    ] = await Promise.all([
      // Daily analytics
      prisma.companyAnalytic.findMany({
        where: { companyId, date: { gte: from } },
        orderBy: { date: 'asc' },
      }),

      // Top products by views
      prisma.product.findMany({
        where: { companyId, status: 'APPROVED', deletedAt: null },
        orderBy: { totalViews: 'desc' },
        take: 5,
        select: {
          id: true, name: true, slug: true, totalViews: true, totalInquiries: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      }),

      // Inquiry breakdown by status
      prisma.inquiry.groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: true,
      }),

      // Quotation acceptance rate
      prisma.rFQQuotation.groupBy({
        by: ['status'],
        where: { companyId },
        _count: true,
      }),

      // Company overview counts
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          totalViews: true,
          totalInquiries: true,
          _count: {
            select: {
              products: { where: { deletedAt: null } },
              reviews: true,
            },
          },
        },
      }),
    ])

    // Aggregate totals from daily analytics
    const totals = analytics.reduce(
      (acc, d) => ({
        profileViews: acc.profileViews + d.profileViews,
        productViews: acc.productViews + d.productViews,
        inquiries:    acc.inquiries    + d.inquiries,
        rfqs:         acc.rfqs         + d.rfqs,
        messages:     acc.messages     + d.messages,
        quotations:   acc.quotations   + d.quotations,
      }),
      { profileViews: 0, productViews: 0, inquiries: 0, rfqs: 0, messages: 0, quotations: 0 }
    )

    const accepted  = quotationStats.find(s => s.status === 'ACCEPTED')?._count || 0
    const totalQuot = quotationStats.reduce((a, s) => a + s._count, 0)
    const acceptanceRate = totalQuot > 0 ? Math.round((accepted / totalQuot) * 100) : 0

    return successResponse({
      totals,
      acceptanceRate,
      dailyChart:    analytics,
      topProducts,
      inquirySummary,
      quotationStats,
      company,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
