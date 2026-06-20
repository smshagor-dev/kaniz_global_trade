'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  PackageSearch,
  Search,
} from 'lucide-react'
import type {
  MarketplaceFeedCategory,
  MarketplaceFeedProduct,
  MarketplaceFeedResult,
  MarketplaceSort,
} from '@/lib/home-marketplace-feed'
import { HOME_MARKETPLACE_FOOTER_REVEAL_COUNT } from '@/lib/home-marketplace-feed'
import { CurrencyRange } from '@/components/currency/currency-range'

const FOOTER_EVENT = 'kgt:home-footer-visible'
const SORT_OPTIONS: Array<{ value: MarketplaceSort; label: string }> = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
  { value: 'verified', label: 'Verified Suppliers' },
]

type FeedQueryState = {
  categoryId: string
  q: string
  sort: MarketplaceSort
}

interface HomeMarketplaceFeedProps {
  categories: MarketplaceFeedCategory[]
  initialFeed: MarketplaceFeedResult
  initialQuery: FeedQueryState
}

function isVerifiedStatus(status?: string | null) {
  return ['ADMIN_VERIFIED', 'PREMIUM_VERIFIED', 'DOCUMENT_VERIFIED'].includes(status || '')
}

function formatNumber(value?: string | number | null) {
  if (value == null || value === '') return null
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return String(value)
  return numeric.toLocaleString()
}

function buildFeedHref(query: FeedQueryState, page: number) {
  const params = new URLSearchParams()
  if (query.categoryId) params.set('feedCategory', query.categoryId)
  if (query.q) params.set('feedQuery', query.q)
  if (query.sort !== 'recommended') params.set('feedSort', query.sort)
  if (page > 1) params.set('feedPage', String(page))
  const search = params.toString()
  return search ? `/?${search}` : '/'
}

export function HomeMarketplaceFeed({
  categories,
  initialFeed,
  initialQuery,
}: HomeMarketplaceFeedProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const requestIdRef = useRef(0)
  const [products, setProducts] = useState(initialFeed.items)
  const [page, setPage] = useState(initialFeed.page)
  const [hasMore, setHasMore] = useState(initialFeed.hasMore)
  const [total, setTotal] = useState(initialFeed.total)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingReset, setLoadingReset] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState(initialQuery.categoryId)
  const [sort, setSort] = useState<MarketplaceSort>(initialQuery.sort)
  const [searchInput, setSearchInput] = useState(initialQuery.q)
  const [query, setQuery] = useState(initialQuery.q)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  const queryStateRef = useRef<FeedQueryState>(initialQuery)
  const pageRef = useRef(initialFeed.page)
  const hasMoreRef = useRef(initialFeed.hasMore)
  const loadingMoreRef = useRef(false)
  const loadingResetRef = useRef(false)
  const loadNextPageRef = useRef<() => void>(() => {})

  useEffect(() => {
    queryStateRef.current = { categoryId, q: query, sort }
  }, [categoryId, query, sort])

  useEffect(() => {
    pageRef.current = page
  }, [page])

  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])

  useEffect(() => {
    loadingMoreRef.current = loadingMore
  }, [loadingMore])

  useEffect(() => {
    loadingResetRef.current = loadingReset
  }, [loadingReset])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('kgt-home-favorites')
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        setFavoriteIds(parsed.filter((item): item is string => typeof item === 'string'))
      }
    } catch {
      // ignore invalid local storage payloads
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const visible = products.length >= HOME_MARKETPLACE_FOOTER_REVEAL_COUNT || !hasMore
    window.dispatchEvent(new CustomEvent(FOOTER_EVENT, { detail: { visible } }))
  }, [products.length, hasMore])

  function persistFavorites(nextFavorites: string[]) {
    setFavoriteIds(nextFavorites)
    window.localStorage.setItem('kgt-home-favorites', JSON.stringify(nextFavorites))
  }

  function toggleFavorite(productId: string) {
    const nextFavorites = favoriteIds.includes(productId)
      ? favoriteIds.filter((id) => id !== productId)
      : [...favoriteIds, productId]
    persistFavorites(nextFavorites)
  }

  function syncUrl(nextQuery: FeedQueryState) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextQuery.categoryId) params.set('feedCategory', nextQuery.categoryId)
    else params.delete('feedCategory')
    if (nextQuery.q) params.set('feedQuery', nextQuery.q)
    else params.delete('feedQuery')
    if (nextQuery.sort !== 'recommended') params.set('feedSort', nextQuery.sort)
    else params.delete('feedSort')
    params.delete('feedPage')

    const nextSearch = params.toString()
    router.replace(nextSearch ? `/?${nextSearch}` : '/', { scroll: false })
  }

  async function fetchFeed(nextQuery: FeedQueryState, nextPage: number) {
    const params = new URLSearchParams({
      page: String(nextPage),
      sort: nextQuery.sort,
    })
    if (nextQuery.categoryId) params.set('categoryId', nextQuery.categoryId)
    if (nextQuery.q) params.set('q', nextQuery.q)

    const response = await fetch(`/api/home-feed?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Failed to load marketplace feed')
    }

    const payload = await response.json() as { data?: MarketplaceFeedResult }

    if (!payload.data) {
      throw new Error('Feed response is missing data')
    }

    return payload.data
  }

  async function loadNextPage() {
    if (!hasMoreRef.current || loadingMoreRef.current || loadingResetRef.current) return

    const nextPage = pageRef.current + 1
    setLoadingMore(true)
    setError(null)

    const requestId = ++requestIdRef.current

    try {
      const nextFeed = await fetchFeed(queryStateRef.current, nextPage)
      if (requestId !== requestIdRef.current) return

      setProducts((current) => [...current, ...nextFeed.items])
      setPage(nextFeed.page)
      setHasMore(nextFeed.hasMore)
      setTotal(nextFeed.total)
    } catch (nextError) {
      if (requestId !== requestIdRef.current) return
      setError(nextError instanceof Error ? nextError.message : 'Unable to load more products')
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingMore(false)
      }
    }
  }

  useEffect(() => {
    loadNextPageRef.current = () => {
      void loadNextPage()
    }
  })

  async function resetFeed(nextQuery: FeedQueryState) {
    setLoadingReset(true)
    setError(null)
    syncUrl(nextQuery)

    const requestId = ++requestIdRef.current

    try {
      const nextFeed = await fetchFeed(nextQuery, 1)
      if (requestId !== requestIdRef.current) return

      setProducts(nextFeed.items)
      setPage(nextFeed.page)
      setHasMore(nextFeed.hasMore)
      setTotal(nextFeed.total)
    } catch (nextError) {
      if (requestId !== requestIdRef.current) return
      setError(nextError instanceof Error ? nextError.message : 'Unable to refresh products')
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingReset(false)
      }
    }
  }

  function handleSortChange(nextSort: MarketplaceSort) {
    setSort(nextSort)
    void resetFeed({ categoryId, q: query, sort: nextSort })
  }

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId)
    void resetFeed({ categoryId: nextCategoryId, q: query, sort })
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextQuery = searchInput.trim()
    setQuery(nextQuery)
    void resetFeed({ categoryId, q: nextQuery, sort })
  }

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]
        if (!firstEntry?.isIntersecting) return
        loadNextPageRef.current()
      },
      { rootMargin: '720px 0px 240px' }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])

  const noResults = !loadingReset && !products.length

  return (
    <section className="bg-[linear-gradient(180deg,#fff9f4_0%,#ffffff_38%,#fffaf6_100%)] py-16">
      <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
        <div className="rounded-[32px] border border-orange-100 bg-white/90 p-5 shadow-[0_24px_70px_-50px_rgba(249,115,22,0.32)] backdrop-blur sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-500">Marketplace feed</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 md:text-4xl">
                More products you may like
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500 md:text-base">
                Continue discovering Alibaba-style sourcing opportunities with verified suppliers, fast inquiry actions, and lazy-loaded browsing.
              </p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-950">{total.toLocaleString()}</span> marketplace products available
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
              <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search products, keywords, or supplier names..."
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-300"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-5 text-sm font-semibold text-white transition hover:scale-[1.01]"
                >
                  Search feed
                </button>
              </form>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Active sort</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {SORT_OPTIONS.find((option) => option.value === sort)?.label || 'Recommended'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCategoryChange('')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  !categoryId
                    ? 'bg-orange-500 text-white shadow-[0_16px_32px_-24px_rgba(249,115,22,0.7)]'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:text-orange-600'
                }`}
              >
                All categories
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryChange(category.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    categoryId === category.id
                      ? 'bg-orange-500 text-white shadow-[0_16px_32px_-24px_rgba(249,115,22,0.7)]'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:text-orange-600'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSortChange(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    sort === option.value
                      ? 'bg-slate-950 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:text-orange-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <noscript>
              <div className="mt-5 rounded-2xl border border-dashed border-orange-200 bg-orange-50/70 p-4">
                <p className="text-sm font-semibold text-slate-900">JavaScript is disabled.</p>
                <p className="mt-1 text-sm text-slate-600">Use the fallback filters and pagination to browse the marketplace feed.</p>
                <form method="get" action="/" className="mt-4 grid gap-3 md:grid-cols-4">
                  <input
                    type="search"
                    name="feedQuery"
                    defaultValue={initialQuery.q}
                    placeholder="Search products"
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                  />
                  <select
                    name="feedCategory"
                    defaultValue={initialQuery.categoryId}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                  >
                    <option value="">All categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  <select
                    name="feedSort"
                    defaultValue={initialQuery.sort}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 text-sm font-semibold text-white"
                  >
                    Apply filters
                  </button>
                </form>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  {initialFeed.page > 1 ? (
                    <Link href={buildFeedHref(initialQuery, initialFeed.page - 1)} className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700">
                      Previous page
                    </Link>
                  ) : null}
                  {initialFeed.page < initialFeed.totalPages ? (
                    <Link href={buildFeedHref(initialQuery, initialFeed.page + 1)} className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700">
                      Next page
                    </Link>
                  ) : null}
                </div>
              </div>
            </noscript>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <FeedProductCard
                key={product.id}
                product={product}
                favorite={favoriteIds.includes(product.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}

            {loadingReset
              ? Array.from({ length: 8 }).map((_, index) => <FeedProductSkeleton key={`reset-${index}`} />)
              : null}

            {loadingMore
              ? Array.from({ length: 4 }).map((_, index) => <FeedProductSkeleton key={`more-${index}`} />)
              : null}
          </div>

          {noResults ? (
            <div className="mt-8 rounded-[28px] border border-dashed border-orange-200 bg-orange-50/60 px-6 py-12 text-center">
              <PackageSearch className="mx-auto h-10 w-10 text-orange-400" />
              <h3 className="mt-4 text-xl font-bold text-slate-950">No products matched this feed</h3>
              <p className="mt-2 text-sm text-slate-500">Try a broader keyword, switch the sort order, or clear the category filter.</p>
            </div>
          ) : null}

          {!loadingReset && !hasMore && products.length ? (
            <div className="mt-8 rounded-[28px] border border-orange-100 bg-orange-50/60 px-6 py-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">End of feed</p>
              <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">
                You have reached the current product stream
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Browse the full marketplace or change filters to continue discovering more sourcing opportunities.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href="/products" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                  Browse full marketplace
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    setQuery('')
                    setCategoryId('')
                    setSort('recommended')
                    void resetFeed({ categoryId: '', q: '', sort: 'recommended' })
                  }}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Reset feed
                </button>
              </div>
            </div>
          ) : null}

          <div ref={sentinelRef} className="h-2 w-full" aria-hidden="true" />

          {loadingMore ? (
            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more products...
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function FeedProductCard({
  product,
  favorite,
  onToggleFavorite,
}: {
  product: MarketplaceFeedProduct
  favorite: boolean
  onToggleFavorite: (productId: string) => void
}) {
  const verified = isVerifiedStatus(product.company.verificationStatus)
  const moq = formatNumber(product.moq)
  const country = product.company.country?.name || 'Global supplier'
  const image = product.image?.url || '/placeholder-product.svg'

  return (
    <article className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_-40px_rgba(15,23,42,0.28)] transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_28px_70px_-44px_rgba(249,115,22,0.34)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Link href={`/products/${product.slug}`} className="block h-full w-full">
          <Image
            src={image}
            alt={product.image?.alt || product.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          />
        </Link>
        <button
          type="button"
          onClick={() => onToggleFavorite(product.id)}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition ${
            favorite
              ? 'border-orange-200 bg-orange-500 text-white'
              : 'border-white/70 bg-white/90 text-slate-700 hover:border-orange-200 hover:text-orange-600'
          }`}
        >
          <Heart className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
        </button>
        {verified ? (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-500">{product.category.name}</p>
          <Link href={`/products/${product.slug}`} className="line-clamp-2 text-lg font-bold leading-snug text-slate-950 transition group-hover:text-orange-600">
            {product.name}
          </Link>
          <p className="line-clamp-2 text-sm leading-6 text-slate-500">
            {product.shortDescription || 'Source directly from marketplace suppliers with fast inquiry-ready listings.'}
          </p>
        </div>

        <div className="rounded-2xl bg-orange-50/70 p-4">
          <p className="text-lg font-black text-slate-950">
            <CurrencyRange minAmount={product.priceMin} maxAmount={product.priceMax} currencyCode={product.currency?.code} />
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {moq ? `MOQ: ${moq} ${product.moqUnit || 'units'}` : 'MOQ available on request'}
          </p>
        </div>

        <div className="space-y-2 text-sm text-slate-600">
          <Link href={`/companies/${product.company.slug}`} className="block font-semibold text-slate-900 transition hover:text-orange-600">
            {product.company.name}
          </Link>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{country}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{product.totalViews.toLocaleString()} views</span>
            <span>{product.totalInquiries.toLocaleString()} inquiries</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/products/${product.slug}#product-inquiry`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
          >
            <MessageSquare className="h-4 w-4" />
            Inquiry
          </Link>
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
          >
            Details
          </Link>
        </div>
      </div>
    </article>
  )
}

function FeedProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_-40px_rgba(15,23,42,0.18)]">
      <div className="aspect-[4/3] animate-pulse bg-slate-200" />
      <div className="space-y-4 p-5">
        <div className="h-3 w-24 animate-pulse rounded-full bg-orange-100" />
        <div className="space-y-2">
          <div className="h-5 w-full animate-pulse rounded-full bg-slate-200" />
          <div className="h-5 w-4/5 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 animate-pulse rounded-2xl bg-orange-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  )
}
