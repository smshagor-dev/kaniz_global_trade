import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const sourceType = searchParams.get('sourceType') || undefined
    const revenueType = searchParams.get('revenueType') || undefined

    const items = await prisma.platformRevenueLedger.findMany({
      where: {
        ...(sourceType ? { sourceType } : {}),
        ...(revenueType ? { revenueType: revenueType as 'CREDIT' | 'REVERSAL' } : {}),
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalRevenue = items.reduce((sum, item) => sum + Number(item.netAmount), 0)
    const revenueByServiceType = Object.entries(
      items.reduce<Record<string, number>>((acc, item) => {
        acc[item.sourceType] = (acc[item.sourceType] || 0) + Number(item.netAmount)
        return acc
      }, {})
    ).map(([sourceTypeKey, total]) => ({ sourceType: sourceTypeKey, total }))

    const monthlyChart = Object.entries(
      items.reduce<Record<string, number>>((acc, item) => {
        const key = item.createdAt.toISOString().slice(0, 7)
        acc[key] = (acc[key] || 0) + Number(item.netAmount)
        return acc
      }, {})
    ).map(([month, total]) => ({ month, total }))

    const yearlyChart = Object.entries(
      items.reduce<Record<string, number>>((acc, item) => {
        const key = String(item.createdAt.getUTCFullYear())
        acc[key] = (acc[key] || 0) + Number(item.netAmount)
        return acc
      }, {})
    ).map(([year, total]) => ({ year, total }))

    return successResponse(
      {
        items,
        summary: {
          totalPlatformRevenue: totalRevenue,
          revenueByServiceType,
          monthlyChart,
          yearlyChart,
        },
      },
      'Revenue ledger fetched'
    )
  } catch (error) {
    return handleApiError(error)
  }
}
