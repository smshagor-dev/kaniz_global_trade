import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const where: Record<string, unknown> = {}

    if (authUser.roles.includes(ROLES.BUYER)) {
      where.buyerId = authUser.userId
    } else if (authUser.companyId && !authUser.roles.includes(ROLES.ADMIN) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      where.companyId = authUser.companyId
    }
    if (status) where.status = status

    const commissions = await prisma.platformCommission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
        tradeOrder: { select: { id: true, productName: true, status: true, totalAmount: true, currencyCode: true } },
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

    const totalsByCurrency = commissions.reduce<Record<string, { amount: number; recognized: number }>>(
      (acc, item) => {
        const code = item.currencyCode || 'USD'
        if (!acc[code]) acc[code] = { amount: 0, recognized: 0 }
        acc[code].amount += Number(item.amount)
        if (item.status === 'ACCRUED' || item.status === 'SETTLED') {
          acc[code].recognized += Number(item.amount)
        }
        return acc
      },
      {}
    )

    return successResponse({
      items: commissions,
      totals,
      totalsByCurrency: Object.entries(totalsByCurrency).map(([currencyCode, values]) => ({
        currencyCode,
        amount: values.amount,
        recognized: values.recognized,
      })),
    }, 'Commissions fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
