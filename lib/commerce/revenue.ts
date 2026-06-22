import prisma from '@/lib/db/prisma'

export const TRADE_COMMISSION_RATE = 1.5
export const SAMPLE_COMMISSION_RATE = 0.75

export function calculateCommissionAmount(baseAmount: number, rate: number) {
  return Number(((baseAmount * rate) / 100).toFixed(2))
}

export async function settleTradeCommission(tradeOrderId: string) {
  const commission = await prisma.platformCommission.findFirst({
    where: { tradeOrderId },
  })

  if (!commission) return null
  if (commission.status === 'ACCRUED' || commission.status === 'SETTLED') return commission

  return prisma.platformCommission.update({
    where: { id: commission.id },
    data: {
      status: 'ACCRUED',
      recognizedAt: new Date(),
    },
  })
}
