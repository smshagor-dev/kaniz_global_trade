import { deleteCachePattern, getCache, setCache } from '@/lib/db/redis'
import {
  PUBLIC_CACHE_PATTERNS,
  PUBLIC_CACHE_TTL,
  homepageCategoriesCacheKey,
  homepageSnapshotCacheKey,
  marketplaceFeedCacheKey,
  productDetailCacheKey,
  rfqBoardCacheKey,
  supplierProfileCacheKey,
} from '@/lib/cache/keys'

export async function rememberPublicCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = await getCache<T>(key)
  if (cached !== null) return cached

  const fresh = await loader()
  await setCache(key, fresh, ttlSeconds)
  return fresh
}

export async function invalidateHomepageCaches(): Promise<void> {
  await deleteCachePattern(PUBLIC_CACHE_PATTERNS.homepage)
}

export async function invalidateProductCaches(productId?: string, slug?: string): Promise<void> {
  await Promise.all([
    deleteCachePattern(PUBLIC_CACHE_PATTERNS.homepage),
    deleteCachePattern(PUBLIC_CACHE_PATTERNS.products),
    productId ? deleteCachePattern(productDetailCacheKey(productId)) : Promise.resolve(),
    slug ? deleteCachePattern(productDetailCacheKey(slug)) : Promise.resolve(),
  ])
}

export async function invalidateCompanyCaches(companyId?: string, slug?: string): Promise<void> {
  await Promise.all([
    deleteCachePattern(PUBLIC_CACHE_PATTERNS.homepage),
    deleteCachePattern(PUBLIC_CACHE_PATTERNS.companies),
    companyId ? deleteCachePattern(supplierProfileCacheKey(companyId)) : Promise.resolve(),
    slug ? deleteCachePattern(supplierProfileCacheKey(slug)) : Promise.resolve(),
  ])
}

export async function invalidateRFQCaches(): Promise<void> {
  await deleteCachePattern(PUBLIC_CACHE_PATTERNS.rfqs)
}

export {
  PUBLIC_CACHE_TTL,
  homepageCategoriesCacheKey,
  homepageSnapshotCacheKey,
  marketplaceFeedCacheKey,
  productDetailCacheKey,
  rfqBoardCacheKey,
  supplierProfileCacheKey,
}
