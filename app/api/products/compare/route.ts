import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ids = (searchParams.get('ids') || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 4)

    if (ids.length === 0) {
      return successResponse([], 'No products selected')
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: ids },
        status: 'APPROVED',
        deletedAt: null,
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        company: { select: { name: true, slug: true, verificationStatus: true } },
        category: { select: { name: true } },
        currency: { select: { code: true, symbol: true } },
        certificates: { select: { id: true, name: true } },
      },
    })

    return successResponse(products, 'Products ready for comparison')
  } catch (error) {
    return handleApiError(error)
  }
}
