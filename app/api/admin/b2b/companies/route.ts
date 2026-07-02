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
    const buyerStatus = searchParams.get('buyerStatus') || undefined
    const supplierStatus = searchParams.get('supplierStatus') || undefined
    const companyType = searchParams.get('companyType') || undefined

    const where: Record<string, unknown> = {}

    if (q) {
      where.OR = [
        { companyName: { contains: q } },
        { legalName: { contains: q } },
        { businessEmail: { contains: q } },
        { phone: { contains: q } },
        { user: { email: { contains: q } } },
      ]
    }

    if (buyerStatus) where.buyerVerificationStatus = buyerStatus
    if (supplierStatus) where.supplierVerificationStatus = supplierStatus
    if (companyType) where.companyType = companyType

    const [companies, total] = await Promise.all([
      prisma.b2BCompany.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.b2BCompany.count({ where }),
    ])

    return successResponse(companies, 'Admin B2B companies fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}
