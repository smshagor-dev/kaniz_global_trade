import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { successResponse, handleApiError } from '@/lib/utils/api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const subcategories = await prisma.subCategory.findMany({
      where: {
        categoryId: id,
        isActive: true,
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
      },
    })

    return successResponse(subcategories)
  } catch (error) {
    return handleApiError(error)
  }
}
