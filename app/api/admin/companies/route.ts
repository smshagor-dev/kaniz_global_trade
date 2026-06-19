import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const q = searchParams.get('q') || undefined
    const status = searchParams.get('status') || undefined
    const where: Record<string, unknown> = {}

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { legalName: { contains: q } },
        { email: { contains: q } },
      ]
    }

    if (status) where.status = status

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          country: { select: { name: true, code: true } },
          creditProfile: true,
          _count: { select: { products: true, inspectionReports: true, tradeOrders: true, sampleOrders: true } },
        },
      }),
      prisma.company.count({ where }),
    ])

    return successResponse(companies, 'Admin companies fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}
