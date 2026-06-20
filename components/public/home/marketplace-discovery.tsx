'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Clock3, FileText, Search, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { VisualSearchModal } from '@/components/public/home/visual-search-modal'

const DISCOVERY_TABS = [
  { href: '/products', label: 'Products' },
  { href: '/companies', label: 'Manufacturers', badge: 'Verified' },
  { href: '/rfqs', label: 'Trade Leads' },
  { href: '/products?verified=true', label: 'Worldwide' },
]

const SEARCH_MODES = [
  { id: 'ai', label: 'AI Search Mode' },
  { id: 'product', label: 'Product Search' },
  { id: 'supplier', label: 'Supplier Search' },
  { id: 'catalog', label: 'Catalog Search' },
  { id: 'image', label: 'Image Search' },
] as const

const TRENDING_KEYWORDS = [
  'solar street light',
  'cotton t-shirt',
  'smart watch',
  'industrial machinery',
  'home textiles',
  'packaging box',
]

const SUGGESTION_POOL = [
  'Smart watch suppliers',
  'Cotton t-shirt wholesale',
  'Solar light manufacturer',
  'Packaging box export',
  'Leather shoes supplier',
  'Agricultural machinery',
  'Construction materials',
  'Mobile accessories',
]

export function MarketplaceDiscovery() {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState<(typeof SEARCH_MODES)[number]['id']>('product')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const placeholder = useMemo(() => {
    if (searchMode === 'supplier') return 'Search suppliers, companies, or countries...'
    if (searchMode === 'catalog') return 'Search catalogs, product groups, or categories...'
    if (pathname.startsWith('/companies')) return 'Search manufacturers, countries, or product lines...'
    if (pathname.startsWith('/rfqs')) return 'Search RFQs, sourcing requests, or categories...'
    return 'Search products, categories, catalogs, or suppliers...'
  }, [pathname, searchMode])

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return SUGGESTION_POOL.slice(0, 5)
    return SUGGESTION_POOL.filter((item) => item.toLowerCase().includes(normalized)).slice(0, 5)
  }, [query])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('kgt-recent-searches')
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, 5))
    } catch {
      // ignore invalid local storage
    }
  }, [])

  function persistRecentSearch(term: string) {
    if (typeof window === 'undefined') return
    const next = [term, ...recentSearches.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 5)
    setRecentSearches(next)
    window.localStorage.setItem('kgt-recent-searches', JSON.stringify(next))
  }

  function submitSearch(nextQuery: string) {
    const normalized = nextQuery.trim()
    if (normalized) persistRecentSearch(normalized)
    setShowSuggestions(false)
    router.push(normalized ? `/products?q=${encodeURIComponent(normalized)}` : '/products')
  }

  return (
    <section id="marketplace-discovery" className="border-b border-orange-100 bg-[radial-gradient(circle_at_top,#fff6ef_0%,#fffaf7_45%,#ffffff_100%)]">
      <div className="w-full px-4 py-5 md:px-6 lg:px-8 lg:py-6 2xl:px-10">
        <div className="flex flex-col items-center gap-4 lg:gap-5">
          <div className="flex flex-wrap items-center justify-center gap-3 text-[15px] font-black tracking-[-0.03em] text-slate-900 sm:gap-4 lg:gap-6 lg:text-[17px]">
            <div className="inline-flex items-center gap-2 pb-2 text-slate-900">
              <span className="text-[21px] font-black tracking-[-0.05em] sm:text-[24px] lg:text-[28px]">AI Mode</span>
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <span className="hidden h-7 w-px bg-slate-300 lg:block" />
            {DISCOVERY_TABS.map((tab) => {
              const active = pathname.startsWith(tab.href.split('?')[0])
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={`relative inline-flex items-center gap-1.5 pb-2 text-[20px] tracking-[-0.05em] transition sm:text-[22px] lg:text-[24px] ${active ? 'text-orange-600' : 'hover:text-orange-600'}`}
                >
                  <span>{tab.label}</span>
                  {tab.badge ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-[9px] font-black tracking-[-0.01em] text-blue-700 shadow-sm sm:text-[10px]">
                      <ShieldCheck className="h-3 w-3" />
                      {tab.badge}
                    </span>
                  ) : null}
                  {active ? <span className="absolute inset-x-2 -bottom-0.5 h-1 rounded-full bg-orange-500" /> : null}
                </Link>
              )
            })}
          </div>

          <div className="flex w-full max-w-[1080px] flex-wrap items-center justify-center gap-2">
            {SEARCH_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSearchMode(mode.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  searchMode === mode.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 shadow-sm hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              submitSearch(query)
            }}
            className="relative flex w-full max-w-[1080px] flex-col gap-4 rounded-[28px] border-2 border-orange-400 bg-white px-4 py-4 shadow-[0_20px_42px_-30px_rgba(249,115,22,0.52)] sm:px-5 sm:py-5"
          >
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={query}
                onFocus={() => setShowSuggestions(true)}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400 sm:text-lg lg:text-[17px]"
              />

              {showSuggestions ? (
                <div className="absolute left-4 right-4 top-[calc(100%-0.5rem)] z-30 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.32)] sm:left-5 sm:right-5">
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        <Search className="h-3.5 w-3.5" />
                        Search suggestions
                      </div>
                      <div className="space-y-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setQuery(suggestion)
                              submitSearch(suggestion)
                            }}
                            className="block w-full rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                      <div>
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          Recent searches
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(recentSearches.length ? recentSearches : ['wireless earbuds', 'industrial pumps', 'cotton socks']).map((item) => (
                            <button
                              key={item}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setQuery(item)
                                submitSearch(item)
                              }}
                              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Trending keywords
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {TRENDING_KEYWORDS.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setQuery(item)
                                submitSearch(item)
                              }}
                              className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-100"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:text-sm">
                  <VisualSearchModal
                    label="Image Search"
                    inlinePanel
                    panelClassName="absolute left-0 top-full z-[80] mt-3 w-[min(960px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.32)]"
                    buttonClassName="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-slate-800 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                  />
                  <span className="truncate">Smart product, category and supplier search</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/rfqs/create"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
                  >
                    <FileText className="h-4 w-4" />
                    Post RFQ
                  </Link>
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 text-base font-semibold text-white shadow-[0_18px_34px_-18px_rgba(249,115,22,0.9)] transition hover:scale-[1.01] sm:px-7 lg:h-14 lg:min-w-[160px] lg:px-8 lg:text-lg"
                  >
                    <Search className="h-4 w-4 lg:h-5 lg:w-5" />
                    Search
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className="flex w-full max-w-[1080px] flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-500">Popular now:</span>
            {TRENDING_KEYWORDS.slice(0, 5).map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => submitSearch(keyword)}
                className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-orange-50 hover:text-orange-600"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
