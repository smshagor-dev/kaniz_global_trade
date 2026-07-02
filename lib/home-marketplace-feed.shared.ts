export const HOME_MARKETPLACE_BATCH_SIZE = 12
export const HOME_MARKETPLACE_FOOTER_REVEAL_COUNT = 36

export const MARKETPLACE_SORTS = ['recommended', 'newest', 'popular', 'verified'] as const

export type MarketplaceSort = (typeof MARKETPLACE_SORTS)[number]

export type MarketplaceFeedQuery = {
  categoryId?: string
  page?: number
  q?: string
  sort?: MarketplaceSort
}

export type MarketplaceFeedCategory = {
  id: string
  name: string
  slug: string
  productCount: number
}

export type MarketplaceFeedProduct = {
  id: string
  slug: string
  name: string
  shortDescription: string | null
  moq: string | null
  moqUnit: string | null
  priceMin: string | null
  priceMax: string | null
  totalViews: number
  totalInquiries: number
  isFeatured: boolean
  image: {
    url: string
    alt: string | null
  } | null
  category: {
    id: string
    name: string
    slug: string
  }
  currency: {
    code: string | null
    symbol: string | null
  } | null
  company: {
    id: string
    name: string
    slug: string
    verificationStatus: string | null
    fraudPublicFlag: string | null
    country: {
      name: string
      code: string | null
    } | null
  }
}

export type MarketplaceFeedResult = {
  items: MarketplaceFeedProduct[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}
