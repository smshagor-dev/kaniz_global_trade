import prisma from '@/lib/db/prisma'

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export async function refreshCompanyCreditProfile(companyId: string) {
  const [completedTradeOrders, completedSampleOrders, disputesCount, fraudReportsCount, verifiedInspection, ratingAgg] =
    await Promise.all([
      prisma.tradeOrder.count({ where: { supplierCompanyId: companyId, status: 'COMPLETED' } }),
      prisma.sampleOrder.count({ where: { supplierCompanyId: companyId, status: 'DELIVERED' } }),
      prisma.escrowDispute.count({ where: { supplierCompanyId: companyId } }),
      prisma.fraudAlert.count({ where: { targetCompanyId: companyId, status: { in: ['OPEN', 'INVESTIGATING', 'WATCHLIST'] } } }),
      prisma.inspectionReport.count({ where: { companyId, status: 'VERIFIED' } }),
      prisma.transactionRating.aggregate({
        where: { recipientCompanyId: companyId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ])

  const successfulDeals = completedTradeOrders + completedSampleOrders
  const avgRating = Number(ratingAgg._avg.rating || 0)
  const score =
    40 +
    successfulDeals * 4 +
    avgRating * 6 +
    verifiedInspection * 10 -
    disputesCount * 6 -
    fraudReportsCount * 10

  return prisma.creditProfile.upsert({
    where: { companyId },
    create: {
      companyId,
      score: clampScore(score),
      successfulDeals,
      disputesCount,
      fraudReportsCount,
      verifiedInspection: verifiedInspection > 0,
      completedKyc: false,
    },
    update: {
      score: clampScore(score),
      successfulDeals,
      disputesCount,
      fraudReportsCount,
      verifiedInspection: verifiedInspection > 0,
    },
  })
}

export async function refreshUserCreditProfile(userId: string) {
  const [completedTradeOrders, completedSampleOrders, kycProfile, fraudReportsCount, ratingAgg] = await Promise.all([
    prisma.tradeOrder.count({ where: { buyerId: userId, status: 'COMPLETED' } }),
    prisma.sampleOrder.count({ where: { buyerId: userId, status: 'DELIVERED' } }),
    prisma.kYCProfile.findUnique({ where: { userId } }),
    prisma.fraudAlert.count({ where: { targetUserId: userId, status: { in: ['OPEN', 'INVESTIGATING', 'WATCHLIST'] } } }),
    prisma.transactionRating.aggregate({
      where: { recipientUserId: userId },
      _avg: { rating: true },
    }),
  ])

  const successfulDeals = completedTradeOrders + completedSampleOrders
  const avgRating = Number(ratingAgg._avg.rating || 0)
  const completedKyc = kycProfile?.status === 'VERIFIED'
  const score = 35 + successfulDeals * 5 + avgRating * 7 + (completedKyc ? 15 : 0) - fraudReportsCount * 12

  return prisma.creditProfile.upsert({
    where: { userId },
    create: {
      userId,
      score: clampScore(score),
      successfulDeals,
      fraudReportsCount,
      completedKyc,
      disputesCount: 0,
      verifiedInspection: false,
    },
    update: {
      score: clampScore(score),
      successfulDeals,
      fraudReportsCount,
      completedKyc,
    },
  })
}
