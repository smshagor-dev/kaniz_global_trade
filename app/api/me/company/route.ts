import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)

    const companyUser = await prisma.companyUser.findFirst({
      where: {
        userId: authUser.userId,
        isPrimary: true,
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    if (!companyUser?.company) throw new ApiError(404, 'Primary company not found')
    return successResponse(companyUser.company, 'Primary company fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
