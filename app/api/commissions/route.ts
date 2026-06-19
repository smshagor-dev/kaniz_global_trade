import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const where: Record<string, unknown> = {}

    if (authUser.roles.includes(ROLES.BUYER)) {
      where.buyerId = authUser.userId
    } else if (authUser.companyId && !authUser.roles.includes(ROLES.ADMIN) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      where.companyId = authUser.companyId
    }

    const commissions = await prisma.platformCommission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
        tradeOrder: { select: { id: true, productName: true, status: true, totalAmount: true } },
      },
    })

    const totals = commissions.reduce(
      (acc, item) => {
        acc.amount += Number(item.amount)
        if (item.status === 'ACCRUED' || item.status === 'SETTLED') acc.recognized += Number(item.amount)
        return acc
      },
      { amount: 0, recognized: 0 }
    )

    return successResponse({ items: commissions, totals }, 'Commissions fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
