import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import {
  ArrowUpRight,
  Building2,
  CheckCircle,
  Globe2,
  MapPin,
  Package,
  SlidersHorizontal,
} from 'lucide-react'
import type { Metadata } from 'next'
import { expandMarketplaceSearchQuery } from '@/lib/ai/google-marketplace-search'
import { UserHistoryTracker } from '@/components/history/user-history-tracker'

export const metadata: Metadata = {
  title: 'Verified Suppliers',
  description: 'Find and connect with verified global suppliers and manufacturers.',
}

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>> }

function normalizeParams(params: Record<string, string | string[] | undefined>) {
  const normalized: Record<string, string> = {}
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') normalized[key] = value
    else if (Array.isArray(value)) normalized[key] = value[0] || ''
  })
  return normalized
}

async function getData(params: Record<string, string>) {
  const page = parseInt(params.page || '1')
  const limit = 20
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { status: 'ACTIVE', deletedAt: null }
  if (params.countryId) where.countryId = params.countryId
  if (params.businessType) where.businessType = params.businessType
  if (params.verified === 'true') where.isVerified = true
  const expanded = params.q ? await expandMarketplaceSearchQuery(params.q, 'companies') : null
  const searchTerms = expanded?.searchTerms || []

  if (params.q) {
    where.OR = [
      { name: { contains: params.q } },
      { mainProducts: { contains: params.q } },
      { description: { contains: params.q } },
      ...searchTerms.flatMap((term) => [
        { name: { contains: term } },
        { mainProducts: { contains: term } },
        { description: { contains: term } },
      ]),
    ]
  }

  const [companies, total, countries, businessTypes] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isFeatured: 'desc' }, { isPremium: 'desc' }, { totalViews: 'desc' }],
      include: {
        country: { select: { name: true, code: true, flag: true } },
        _count: { select: { products: { where: { status: 'APPROVED' } }, reviews: true } },
      },
    }),
    prisma.company.count({ where }),
    prisma.country.findMany({
      where: { companies: { some: { status: 'ACTIVE' } } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, flag: true },
      take: 30,
    }),
    ['MANUFACTURER', 'TRADING_COMPANY', 'BUYING_OFFICE', 'AGENT', 'DISTRIBUTOR'],
  ])

  return { companies, total, countries, businessTypes, page, limit, expanded }
}

function buildFilterHref(
  resolved: Record<string, string>,
  updates: Record<string, string | null | undefined>
) {
  const params = new URLSearchParams()
  Object.entries({ ...resolved, ...updates }).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  return `/companies?${params.toString()}`
}

export default async function CompaniesPage({ searchParams }: Props) {
  const resolved = normalizeParams(await searchParams)
  const { companies, total, countries, businessTypes, page, limit, expanded } = await getData(resolved)
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-[#f6f7f3] px-4 py-8 md:px-6 lg:px-8 2xl:px-10">
      {resolved.q ? (
        <UserHistoryTracker
          payload={{
            type: 'SEARCH',
            query: resolved.q,
            normalizedQuery: expanded?.normalizedQuery || resolved.q,
            scope: 'companies',
            mode: expanded?.usedAI ? 'ai' : 'direct',
            resultsCount: total,
            filters: {
              countryId: resolved.countryId || null,
              businessType: resolved.businessType || null,
              verified: resolved.verified || null,
            },
          }}
        />
      ) : null}

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-[#d8dfcf] bg-white shadow-[0_18px_50px_rgba(31,41,55,0.05)]">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.2fr)_300px] lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8dfcf] bg-[#f6f7f3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#516046]">
                <Globe2 className="h-3.5 w-3.5" />
                Global Supplier Directory
              </div>
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-[#1f2937] sm:text-4xl">
                Find trusted suppliers with a clean, easy-to-scan shortlist
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5f6b62] sm:text-base">
                Browse verified companies, compare product focus, and quickly move from research to inquiry without digging through crowded tables.
              </p>
              {resolved.q && expanded?.usedAI ? (
                <p className="mt-4 text-xs font-medium text-[#365446]">
                  AI-assisted search is expanding your query to surface better supplier matches.
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl border border-[#d8dfcf] bg-[#f6f7f3] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d7a69]">Suppliers</p>
                <p className="mt-3 text-3xl font-semibold text-[#1f2937]">{total.toLocaleString()}</p>
                <p className="mt-1 text-sm text-[#68756b]">Active supplier profiles</p>
              </div>
              <div className="rounded-3xl border border-[#d8dfcf] bg-[#f6f7f3] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d7a69]">Verified filter</p>
                <p className="mt-3 text-lg font-semibold text-[#1f2937]">
                  {resolved.verified === 'true' ? 'Enabled' : 'Available'}
                </p>
                <p className="mt-1 text-sm text-[#68756b]">Focus on validated companies</p>
              </div>
              <div className="rounded-3xl border border-[#d8dfcf] bg-[#f6f7f3] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d7a69]">Search mode</p>
                <p className="mt-3 text-lg font-semibold text-[#1f2937]">{resolved.q ? 'Filtered' : 'Browse all'}</p>
                <p className="mt-1 text-sm text-[#68756b]">Simple browsing with clear filters</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[28px] border border-[#d8dfcf] bg-white p-5 shadow-[0_18px_45px_rgba(31,41,55,0.04)]">
            <div className="flex items-center gap-2 border-b border-[#e5eadf] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef2e7] text-[#516046]">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#1f2937]">Filters</h2>
                <p className="text-xs text-[#68756b]">Keep supplier discovery focused</p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d7a69]">Verification</h3>
                <div className="mt-3 space-y-2">
                  <Link
                    href={buildFilterHref(resolved, { verified: null, page: null })}
                    className={`block rounded-2xl border px-3 py-3 text-sm transition ${
                      resolved.verified !== 'true'
                        ? 'border-[#cfd8c2] bg-[#eef2e7] font-semibold text-[#1f2937]'
                        : 'border-[#e5eadf] text-[#566258] hover:border-[#d8dfcf]'
                    }`}
                  >
                    All suppliers
                  </Link>
                  <Link
                    href={buildFilterHref(resolved, { verified: 'true', page: null })}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm transition ${
                      resolved.verified === 'true'
                        ? 'border-[#cfd8c2] bg-[#eef2e7] font-semibold text-[#1f2937]'
                        : 'border-[#e5eadf] text-[#566258] hover:border-[#d8dfcf]'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 text-[#54724f]" />
                    Verified only
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d7a69]">Business type</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={buildFilterHref(resolved, { businessType: null, page: null })}
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                      !resolved.businessType
                        ? 'border-[#cfd8c2] bg-[#eef2e7] text-[#1f2937]'
                        : 'border-[#e5eadf] text-[#5f6b62] hover:border-[#d8dfcf]'
                    }`}
                  >
                    All
                  </Link>
                  {businessTypes.map((bt) => (
                    <Link
                      key={bt}
                      href={buildFilterHref(resolved, { businessType: bt, page: null })}
                      className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                        resolved.businessType === bt
                          ? 'border-[#cfd8c2] bg-[#eef2e7] text-[#1f2937]'
                          : 'border-[#e5eadf] text-[#5f6b62] hover:border-[#d8dfcf]'
                      }`}
                    >
                      {bt.replace(/_/g, ' ')}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d7a69]">Country</h3>
                <div className="mt-3 space-y-2">
                  <Link
                    href={buildFilterHref(resolved, { countryId: null, page: null })}
                    className={`block rounded-2xl border px-3 py-3 text-sm transition ${
                      !resolved.countryId
                        ? 'border-[#cfd8c2] bg-[#eef2e7] font-semibold text-[#1f2937]'
                        : 'border-[#e5eadf] text-[#566258] hover:border-[#d8dfcf]'
                    }`}
                  >
                    All countries
                  </Link>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {countries.map((country) => (
                      <Link
                        key={country.id}
                        href={buildFilterHref(resolved, { countryId: country.id, page: null })}
                        className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm transition ${
                          resolved.countryId === country.id
                            ? 'border-[#cfd8c2] bg-[#eef2e7] font-semibold text-[#1f2937]'
                            : 'border-[#e5eadf] text-[#566258] hover:border-[#d8dfcf]'
                        }`}
                      >
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="space-y-4">
            <div className="flex flex-col gap-2 rounded-[28px] border border-[#d8dfcf] bg-white px-5 py-4 shadow-[0_18px_45px_rgba(31,41,55,0.04)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1f2937]">Supplier results</h2>
                <p className="text-sm text-[#68756b]">
                  {total.toLocaleString()} company{total === 1 ? '' : 'ies'} available
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[#566258]">
                {resolved.businessType ? (
                  <span className="rounded-full bg-[#f3f5ef] px-3 py-2">Type: {resolved.businessType.replace(/_/g, ' ')}</span>
                ) : null}
                {resolved.countryId ? <span className="rounded-full bg-[#f3f5ef] px-3 py-2">Country filtered</span> : null}
                {resolved.verified === 'true' ? <span className="rounded-full bg-[#f3f5ef] px-3 py-2">Verified only</span> : null}
              </div>
            </div>

            {companies.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#d8dfcf] bg-white px-6 py-16 text-center shadow-[0_18px_45px_rgba(31,41,55,0.03)]">
                <Building2 className="mx-auto h-14 w-14 text-[#a0aa9d]" />
                <h3 className="mt-4 text-lg font-semibold text-[#1f2937]">No suppliers found</h3>
                <p className="mt-2 text-sm text-[#68756b]">Try another country, supplier type, or search term.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {companies.map((company) => (
                  <Link
                    key={company.id}
                    href={`/companies/${company.slug}`}
                    className="group rounded-[28px] border border-[#d8dfcf] bg-white p-5 shadow-[0_18px_45px_rgba(31,41,55,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(31,41,55,0.08)]"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-[#eef2e7] text-xl font-semibold text-[#516046]">
                        {company.logo ? (
                          <img src={company.logo} alt={company.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{company.name[0]}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-semibold text-[#1f2937] transition group-hover:text-[#384c33]">
                                {company.name}
                              </h3>
                              {company.isVerified ? <CheckCircle className="h-4 w-4 text-[#2f7a4f]" /> : null}
                              {company.isFeatured ? (
                                <span className="rounded-full bg-[#edf1e7] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#566258]">
                                  Featured
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#5f6b62]">
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                {company.country?.flag} {company.country?.name}
                              </span>
                              <span>{company.businessType.replace(/_/g, ' ')}</span>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f5ef] px-3 py-1.5 text-xs font-medium text-[#4f5d49]">
                            View profile
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </span>
                        </div>

                        {company.mainProducts ? (
                          <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#566258]">{company.mainProducts}</p>
                        ) : (
                          <p className="mt-4 text-sm leading-6 text-[#7b857c]">Company product highlights are not listed yet.</p>
                        )}

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl bg-[#f6f7f3] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-[#7b857c]">Products</p>
                            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1f2937]">
                              <Package className="h-3.5 w-3.5 text-[#54724f]" />
                              {company._count.products}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-[#f6f7f3] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-[#7b857c]">Inquiries</p>
                            <p className="mt-1 text-sm font-semibold text-[#1f2937]">{company.totalInquiries}</p>
                          </div>
                          <div className="rounded-2xl bg-[#f6f7f3] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-[#7b857c]">Reviews</p>
                            <p className="mt-1 text-sm font-semibold text-[#1f2937]">{company._count.reviews}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {totalPages > 1 ? (
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={buildFilterHref(resolved, { page: String(p) })}
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                      p === page
                        ? 'border-[#cfd8c2] bg-[#eef2e7] text-[#1f2937]'
                        : 'border-[#d8dfcf] bg-white text-[#566258] hover:border-[#c1cbb6]'
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  )
}
