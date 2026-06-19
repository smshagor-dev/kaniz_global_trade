'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Search, ShieldCheck, Sparkles } from 'lucide-react'
import { VisualSearchModal } from '@/components/public/home/visual-search-modal'

const DISCOVERY_TABS = [
  { href: '/products', label: 'Products' },
  { href: '/companies', label: 'Manufacturers', badge: 'Verified' },
  { href: '/rfqs', label: 'Trade Leads' },
  { href: '/products?verified=true', label: 'Worldwide' },
]

export function MarketplaceDiscovery() {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')

  const placeholder = useMemo(() => {
    if (pathname.startsWith('/companies')) return 'Search manufacturers, countries, or product lines...'
    if (pathname.startsWith('/rfqs')) return 'Search RFQs, sourcing requests, or categories...'
    return 'Search products, categories, catalogs, or suppliers...'
  }, [pathname])

  function submitSearch(nextQuery: string) {
    const normalized = nextQuery.trim()
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

          <form
            onSubmit={(event) => {
              event.preventDefault()
              submitSearch(query)
            }}
            className="flex w-full max-w-[980px] flex-col gap-4 rounded-[28px] border-2 border-orange-400 bg-white px-4 py-4 shadow-[0_20px_42px_-30px_rgba(249,115,22,0.52)] sm:px-5 sm:py-5"
          >
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400 sm:text-lg lg:text-[17px]"
              />
              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:text-sm">
                <VisualSearchModal
                  label="Image Search"
                  inlinePanel
                  panelClassName="absolute left-0 top-full z-[80] mt-3 w-[min(960px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.32)]"
                  buttonClassName="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-slate-800 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                />
                <span className="truncate">Smart product, category and supplier search</span>
                </div>

                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 text-base font-semibold text-white shadow-[0_18px_34px_-18px_rgba(249,115,22,0.9)] transition hover:scale-[1.01] sm:h-13 sm:px-7 lg:h-14 lg:min-w-[160px] lg:px-8 lg:text-lg"
                >
                  <Search className="h-4 w-4 lg:h-5 lg:w-5" />
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
