import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const [user, company] = await Promise.all([
      prisma.user.findUnique({
        where: { id: authUser.userId },
        select: {
          fraudRiskLevel: true,
          fraudPublicFlag: true,
        },
      }),
      authUser.companyId
        ? prisma.company.findUnique({
            where: { id: authUser.companyId },
            select: {
              id: true,
              name: true,
              fraudRiskLevel: true,
              fraudPublicFlag: true,
            },
          })
        : Promise.resolve(null),
    ])

    return successResponse({
      user,
      company,
    }, 'Fraud status fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
