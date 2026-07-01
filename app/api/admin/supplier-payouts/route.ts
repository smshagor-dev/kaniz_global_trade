import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const payoutStatus = searchParams.get('payoutStatus') || undefined

    const items = await prisma.supplierPayoutLedger.findMany({
      where: payoutStatus ? { payoutStatus: payoutStatus as never } : undefined,
      include: {
        supplier: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: { select: { id: true, name: true, slug: true } },
        tradeOrder: { select: { id: true, productName: true, currencyCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(items, 'Supplier payout ledger fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
