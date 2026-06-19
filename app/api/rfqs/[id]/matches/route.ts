import { NextRequest } from 'next/server'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import prisma from '@/lib/db/prisma'
import { getSmartMatchesForRFQ } from '@/lib/ai/rfq-matching'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      select: { buyerId: true },
    })

    if (!rfq) throw new ApiError(404, 'RFQ not found')
    if (rfq.buyerId !== authUser.userId && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new ApiError(403, 'Access denied')
    }

    const data = await getSmartMatchesForRFQ(id)
    if (!data) throw new ApiError(404, 'RFQ not found')

    return successResponse(data, 'Smart matches generated')
  } catch (error) {
    return handleApiError(error)
  }
}
