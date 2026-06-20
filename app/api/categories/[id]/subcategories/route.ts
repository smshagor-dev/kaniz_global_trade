import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getAuthUser, isAdmin, isSupplier } from '@/lib/permissions'
import { successResponse, handleApiError } from '@/lib/utils/api'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await getAuthUser(req)
    const { searchParams } = new URL(req.url)
    const scope = searchParams.get('scope')

    const subcategories = await prisma.subCategory.findMany({
      where: {
        categoryId: id,
        isActive: true,
        ...(scope === 'dashboard' && authUser && (isSupplier(authUser) || isAdmin(authUser))
          ? {
              OR: [
                { approvalStatus: 'APPROVED' },
                { createdById: authUser.userId },
              ],
            }
          : { approvalStatus: 'APPROVED' }),
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
