import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { buildB2BStatusSummary } from '@/lib/b2b/company-service'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)

    const company = await prisma.b2BCompany.findUnique({
      where: { userId: authUser.userId },
      select: {
        id: true,
        companyType: true,
        companyName: true,
        buyerVerificationStatus: true,
        buyerVerificationNote: true,
        buyerVerifiedAt: true,
        supplierVerificationStatus: true,
        supplierVerificationNote: true,
        supplierVerifiedAt: true,
      },
    })

    return successResponse({
      company,
      ...buildB2BStatusSummary(company),
    }, 'B2B company status fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
