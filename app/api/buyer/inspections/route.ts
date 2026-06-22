import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth, isBuyer, isAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (!isBuyer(authUser) && !isAdmin(authUser)) {
      throw new ApiError(403, 'Buyer access required')
    }

    const [tradeOrders, sampleOrders] = await Promise.all([
      prisma.tradeOrder.findMany({
        where: { buyerId: authUser.userId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          supplierCompanyId: true,
          supplierCompany: { select: { id: true, name: true, slug: true, country: { select: { name: true, flag: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sampleOrder.findMany({
        where: { buyerId: authUser.userId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          supplierCompanyId: true,
          supplierCompany: { select: { id: true, name: true, slug: true, country: { select: { name: true, flag: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const companyIds = Array.from(new Set([
      ...tradeOrders.map((order) => order.supplierCompanyId),
      ...sampleOrders.map((order) => order.supplierCompanyId),
    ]))

    const reports = companyIds.length
      ? await prisma.inspectionReport.findMany({
          where: {
            companyId: { in: companyIds },
            status: { in: ['COMPLETED', 'VERIFIED'] },
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                country: { select: { name: true, flag: true } },
              },
            },
          },
          orderBy: [{ status: 'desc' }, { inspectedAt: 'desc' }, { createdAt: 'desc' }],
        })
      : []

    const reportsByCompany = reports.reduce<Record<string, typeof reports>>((acc, report) => {
      acc[report.companyId] = [...(acc[report.companyId] || []), report]
      return acc
    }, {})

    const orderContextMap = new Map<string, { tradeOrders: number; sampleOrders: number; lastOrderAt: Date | null }>()
    for (const order of tradeOrders) {
      const current = orderContextMap.get(order.supplierCompanyId) || { tradeOrders: 0, sampleOrders: 0, lastOrderAt: null }
      current.tradeOrders += 1
      current.lastOrderAt = !current.lastOrderAt || order.createdAt > current.lastOrderAt ? order.createdAt : current.lastOrderAt
      orderContextMap.set(order.supplierCompanyId, current)
    }
    for (const order of sampleOrders) {
      const current = orderContextMap.get(order.supplierCompanyId) || { tradeOrders: 0, sampleOrders: 0, lastOrderAt: null }
      current.sampleOrders += 1
      current.lastOrderAt = !current.lastOrderAt || order.createdAt > current.lastOrderAt ? order.createdAt : current.lastOrderAt
      orderContextMap.set(order.supplierCompanyId, current)
    }

    const companies = companyIds.map((companyId) => {
      const sample = tradeOrders.find((item) => item.supplierCompanyId === companyId)?.supplierCompany
        || sampleOrders.find((item) => item.supplierCompanyId === companyId)?.supplierCompany

      return {
        companyId,
        company: sample,
        orderContext: orderContextMap.get(companyId) || { tradeOrders: 0, sampleOrders: 0, lastOrderAt: null },
        reports: reportsByCompany[companyId] || [],
      }
    })

    const stats = {
      supplierCompanies: companies.length,
      totalReports: reports.length,
      verifiedReports: reports.filter((report) => report.status === 'VERIFIED').length,
      completedReports: reports.filter((report) => report.status === 'COMPLETED').length,
    }

    return successResponse({ stats, companies }, 'Buyer inspections fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
