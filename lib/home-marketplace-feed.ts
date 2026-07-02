import 'server-only'
import prisma from '@/lib/db/prisma'
import { expandMarketplaceSearchQuery } from '@/lib/ai/google-marketplace-search'
import { PUBLIC_CACHE_TTL, homepageCategoriesCacheKey, marketplaceFeedCacheKey, rememberPublicCache } from '@/lib/cache/public'
import {
  HOME_MARKETPLACE_BATCH_SIZE,
  MARKETPLACE_SORTS,
  type MarketplaceFeedCategory,
  type MarketplaceFeedProduct,
  type MarketplaceFeedQuery,
  type MarketplaceFeedResult,
  type MarketplaceSort,
} from '@/lib/home-marketplace-feed.shared'

export {
  HOME_MARKETPLACE_BATCH_SIZE,
  type MarketplaceFeedCategory,
  type MarketplaceFeedProduct,
  type MarketplaceFeedQuery,
  type MarketplaceFeedResult,
  type MarketplaceSort,
} from '@/lib/home-marketplace-feed.shared'

const VERIFIED_STATUSES = ['ADMIN_VERIFIED', 'PREMIUM_VERIFIED', 'DOCUMENT_VERIFIED'] as const

export function normalizeMarketplaceSort(value?: string | null): MarketplaceSort {
  if (value && MARKETPLACE_SORTS.includes(value as MarketplaceSort)) {
    return value as MarketplaceSort
  }
  return 'recommended'
}

export function normalizeMarketplacePage(value?: string | null): number {
  const page = Number(value || '1')
  if (!Number.isFinite(page) || page < 1) return 1
  return Math.floor(page)
}

export function normalizeMarketplaceQuery(params: {
  categoryId?: string | null
  page?: string | null
  q?: string | null
  sort?: string | null
}): Required<MarketplaceFeedQuery> {
  return {
    categoryId: params.categoryId?.trim() || '',
    page: normalizeMarketplacePage(params.page),
    q: params.q?.trim() || '',
    sort: normalizeMarketplaceSort(params.sort),
  }
}

function serializeDecimal(value: { toString(): string } | number | string | null | undefined) {
  if (value == null) return null
  return value.toString()
}

async function buildFeedWhere(query: Required<MarketplaceFeedQuery>) {
  const where: Record<string, unknown> = {
    deletedAt: null,
    status: 'APPROVED',
    category: { approvalStatus: 'APPROVED', isActive: true },
    AND: [
      {
        OR: [
          { subcategoryId: null },
          { subcategory: { approvalStatus: 'APPROVED', isActive: true } },
        ],
      },
    ],
    company: {
      deletedAt: null,
      status: 'ACTIVE',
      ...(query.sort === 'verified'
        ? { verificationStatus: { in: VERIFIED_STATUSES } }
        : {}),
    },
  }

  if (query.categoryId) where.categoryId = query.categoryId

  const expanded = query.q ? await expandMarketplaceSearchQuery(query.q, 'products') : null
  const searchTerms = expanded?.searchTerms || []

  if (query.q) {
    where.OR = [
      { name: { contains: query.q } },
      { shortDescription: { contains: query.q } },
      { category: { name: { contains: query.q } } },
      { subcategory: { name: { contains: query.q } } },
      { company: { name: { contains: query.q } } },
      ...searchTerms.flatMap((term) => [
        { name: { contains: term } },
        { shortDescription: { contains: term } },
        { category: { name: { contains: term } } },
        { subcategory: { name: { contains: term } } },
        { company: { name: { contains: term } } },
      ]),
    ]
  }

  return where
}

function buildFeedOrderBy(sort: MarketplaceSort) {
  if (sort === 'newest') {
    return [{ createdAt: 'desc' as const }]
  }

  if (sort === 'popular') {
    return [
      { totalViews: 'desc' as const },
      { totalInquiries: 'desc' as const },
      { createdAt: 'desc' as const },
    ]
  }

  if (sort === 'verified') {
    return [
      { isFeatured: 'desc' as const },
      { totalViews: 'desc' as const },
      { totalInquiries: 'desc' as const },
      { createdAt: 'desc' as const },
    ]
  }

  return [
    { isFeatured: 'desc' as const },
    { totalViews: 'desc' as const },
    { totalInquiries: 'desc' as const },
    { createdAt: 'desc' as const },
  ]
}

export async function getMarketplaceFeedCategories(limit = 10): Promise<MarketplaceFeedCategory[]> {
  return rememberPublicCache(
    homepageCategoriesCacheKey(limit),
    PUBLIC_CACHE_TTL.homepageCategories,
    async () => {
      const categories = await prisma.category.findMany({
        where: { isActive: true, parentId: null, approvalStatus: 'APPROVED' },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              products: {
                where: {
                  status: 'APPROVED',
                  deletedAt: null,
                },
              },
            },
          },
        },
      })

      return categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        productCount: category._count.products,
      }))
    }
  )
}

export async function getMarketplaceFeedPage(
  rawQuery: MarketplaceFeedQuery,
  limit = HOME_MARKETPLACE_BATCH_SIZE
): Promise<MarketplaceFeedResult> {
  const query = {
    categoryId: rawQuery.categoryId || '',
    page: Math.max(1, rawQuery.page || 1),
    q: rawQuery.q || '',
    sort: rawQuery.sort || 'recommended',
  } satisfies Required<MarketplaceFeedQuery>

  const skip = (query.page - 1) * limit
  const where = await buildFeedWhere(query)
  const orderBy = buildFeedOrderBy(query.sort)

  return rememberPublicCache(
    marketplaceFeedCacheKey({
      categoryId: query.categoryId,
      page: query.page,
      q: query.q,
      sort: query.sort,
      limit,
    }),
    PUBLIC_CACHE_TTL.homepage,
    async () => {
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: [...orderBy, { id: 'desc' as const }],
          select: {
            id: true,
            slug: true,
            name: true,
            shortDescription: true,
            moq: true,
            moqUnit: true,
            priceMin: true,
            priceMax: true,
            totalViews: true,
            totalInquiries: true,
            isFeatured: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true, alt: true },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            currency: {
              select: {
                code: true,
                symbol: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                verificationStatus: true,
                fraudPublicFlag: true,
                country: {
                  select: {
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        }),
        prisma.product.count({ where }),
      ])

      const totalPages = Math.max(1, Math.ceil(total / limit))

      return {
        items: products.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          shortDescription: product.shortDescription,
          moq: serializeDecimal(product.moq),
          moqUnit: product.moqUnit,
          priceMin: serializeDecimal(product.priceMin),
          priceMax: serializeDecimal(product.priceMax),
          totalViews: product.totalViews,
          totalInquiries: product.totalInquiries,
          isFeatured: product.isFeatured,
          image: product.images[0]
            ? {
                url: product.images[0].url,
                alt: product.images[0].alt,
              }
            : null,
          category: product.category,
          currency: product.currency,
          company: product.company,
        })),
        total,
        page: query.page,
        limit,
        totalPages,
        hasMore: query.page < totalPages,
      }
    }
  )
}
