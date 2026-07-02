export const PUBLIC_CACHE_TTL = {
  homepage: 300,
  homepageCategories: 900,
  supplierProfile: 600,
  productDetail: 600,
  rfqBoard: 180,
} as const

function encodePart(value: string | number | boolean | null | undefined) {
  return encodeURIComponent(String(value ?? ''))
}

export function homepageSnapshotCacheKey() {
  return 'public:homepage:snapshot'
}

export function homepageCategoriesCacheKey(limit: number) {
  return `public:homepage:categories:${limit}`
}

export function marketplaceFeedCacheKey(input: { categoryId?: string; page: number; q?: string; sort: string; limit: number }) {
  return [
    'public:homepage:feed',
    encodePart(input.categoryId || ''),
    encodePart(input.page),
    encodePart(input.q || ''),
    encodePart(input.sort),
    encodePart(input.limit),
  ].join(':')
}

export function productDetailCacheKey(identifier: string) {
  return `public:product:${encodePart(identifier)}`
}

export function supplierProfileCacheKey(identifier: string) {
  return `public:company:${encodePart(identifier)}`
}

export function rfqBoardCacheKey(search: string) {
  return `public:rfq-board:${encodePart(search)}`
}

export const PUBLIC_CACHE_PATTERNS = {
  homepage: 'public:homepage:*',
  products: 'public:product:*',
  companies: 'public:company:*',
  rfqs: 'public:rfq-board:*',
} as const
