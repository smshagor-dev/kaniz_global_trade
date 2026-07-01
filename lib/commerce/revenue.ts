import prisma from '@/lib/db/prisma'
import { feeCalculationService } from '@/lib/finance/service-fees'
import { RevenueLedgerStatus } from '@prisma/client'

export async function settleTradeCommission(tradeOrderId: string) {
  const order = await prisma.tradeOrder.findUnique({
    where: { id: tradeOrderId },
    include: {
      payments: {
        where: { status: 'PAID' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      platformRevenueLedgers: {
        where: { sourceType: 'TRADE_ORDER_TRANSACTION_FEE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!order) return null

  if (order.platformRevenueLedgers[0]) {
    return prisma.platformRevenueLedger.update({
      where: { id: order.platformRevenueLedgers[0].id },
      data: { status: RevenueLedgerStatus.POSTED },
    })
  }

  const created = await feeCalculationService.createTradeOrderFinancials({
    tradeOrderId: order.id,
    buyerId: order.buyerId,
    companyId: order.supplierCompanyId,
    paymentId: order.payments[0]?.id ?? null,
  })

  return created.revenueLedger
}
