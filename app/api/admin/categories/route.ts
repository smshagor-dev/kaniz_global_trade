import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        subcategories: { select: { id: true, name: true, slug: true, isActive: true } },
        _count: { select: { products: true } },
      },
    })

    return successResponse(categories)
  } catch (error) {
    return handleApiError(error)
  }
}
