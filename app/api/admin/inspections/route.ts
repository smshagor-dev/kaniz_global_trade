import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const status = searchParams.get('status') || undefined
    const companyId = searchParams.get('companyId') || undefined
    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (companyId) where.companyId = companyId

    const [reports, total] = await Promise.all([
      prisma.inspectionReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          company: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.inspectionReport.count({ where }),
    ])

    return successResponse(reports, 'Inspection reports fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}
