import prisma from '@/lib/db/prisma'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export async function scoreFinancingRequest(requestId: string) {
  const request = await prisma.financingRequest.findUnique({
    where: { id: requestId },
    include: {
      company: {
        include: {
          creditProfile: true,
          inspectionReports: { where: { status: { in: ['COMPLETED', 'VERIFIED'] } }, take: 5 },
          tradeOrders: { where: { status: 'COMPLETED' }, take: 20 },
        },
      },
    },
  })

  if (!request) return null

  const companyCredit = request.company.creditProfile?.score ?? 50
  const completedTrades = request.company.tradeOrders.length
  const verifiedInspections = request.company.inspectionReports.filter((item) => item.status === 'VERIFIED').length
  const exposurePenalty = Number(request.amount) > 100000 ? 15 : Number(request.amount) > 50000 ? 8 : 0
  const score = clamp(companyCredit * 0.6 + completedTrades * 2 + verifiedInspections * 5 - exposurePenalty, 0, 100)
  const recommendedLimit = Math.max(5000, Math.round((score / 100) * Number(request.amount)))
  const riskBand = score >= 75 ? 'LOW' : score >= 50 ? 'MEDIUM' : 'HIGH'

  return prisma.financingRequest.update({
    where: { id: request.id },
    data: {
      riskScore: score,
      recommendedLimit,
      riskNotes: `Risk band ${riskBand}. Credit ${companyCredit}, completed trades ${completedTrades}, verified inspections ${verifiedInspections}.`,
    },
  })
}
