import prisma from '@/lib/db/prisma'

export interface RatingSummary {
  average: number
  count: number
}

export interface PublicRatingEntry {
  id: string
  rating: number
  title: string | null
  comment: string | null
  createdAt: Date
  authorUser: {
    firstName: string
    lastName: string
    avatar: string | null
  }
}

function toSummary(average: number | null, count: number): RatingSummary {
  if (!count || average == null) {
    return { average: 0, count: 0 }
  }

  return {
    average: Math.round(average * 10) / 10,
    count,
  }
}

export async function getCompanyRatingSummary(companyId: string) {
  const result = await prisma.transactionRating.aggregate({
    where: { recipientCompanyId: companyId },
    _avg: { rating: true },
    _count: { rating: true },
  })

  return toSummary(result._avg.rating, result._count.rating)
}

export async function getCompanyRatingSummaries(companyIds: string[]) {
  if (!companyIds.length) return new Map<string, RatingSummary>()

  const rows = await prisma.transactionRating.groupBy({
    by: ['recipientCompanyId'],
    where: {
      recipientCompanyId: { in: companyIds },
    },
    _avg: { rating: true },
    _count: { rating: true },
  })

  return new Map(
    rows
      .filter((row) => row.recipientCompanyId)
      .map((row) => [row.recipientCompanyId as string, toSummary(row._avg.rating, row._count.rating)])
  )
}

export async function getRecentCompanyRatings(companyId: string, limit = 5) {
  return prisma.transactionRating.findMany({
    where: { recipientCompanyId: companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      createdAt: true,
      authorUser: {
        select: {
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
  })
}

export async function getProductRatingSummary(productId: string) {
  const result = await prisma.transactionRating.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  })

  return toSummary(result._avg.rating, result._count.rating)
}

export async function getProductRatingSummaries(productIds: string[]) {
  if (!productIds.length) return new Map<string, RatingSummary>()

  const rows = await prisma.transactionRating.groupBy({
    by: ['productId'],
    where: {
      productId: { in: productIds },
    },
    _avg: { rating: true },
    _count: { rating: true },
  })

  return new Map(
    rows
      .filter((row) => row.productId)
      .map((row) => [row.productId as string, toSummary(row._avg.rating, row._count.rating)])
  )
}

export async function getRecentProductRatings(productId: string, limit = 5) {
  return prisma.transactionRating.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      createdAt: true,
      authorUser: {
        select: {
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
  })
}
