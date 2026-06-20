import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { Building2, CheckCircle, Search, SlidersHorizontal, MapPin, Package } from 'lucide-react'
import type { Metadata } from 'next'

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
  const page  = parseInt(params.page || '1')
  const limit = 20
  const skip  = (page - 1) * limit

  const where: Record<string, unknown> = { status: 'ACTIVE', deletedAt: null }
  if (params.countryId)    where.countryId    = params.countryId
  if (params.businessType) where.businessType = params.businessType
  if (params.verified === 'true') where.isVerified = true
  if (params.q) {
    where.OR = [
      { name: { contains: params.q } },
      { mainProducts: { contains: params.q } },
      { description: { contains: params.q } },
    ]
  }

  const [companies, total, countries, businessTypes] = await Promise.all([
    prisma.company.findMany({
      where, skip, take: limit,
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

  return { companies, total, countries, businessTypes, page, limit }
}

export default async function CompaniesPage({ searchParams }: Props) {
  const resolved = normalizeParams(await searchParams)
  const { companies, total, countries, businessTypes, page, limit } = await getData(resolved)
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="w-full px-4 py-8 md:px-6 lg:px-8 2xl:px-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find Verified Suppliers</h1>
        <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} companies from around the world</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-56 flex-shrink-0">
          <div className="bg-white border border-gray-100 rounded-xl p-5 sticky top-20">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </h3>

            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Verification</h4>
              <Link
                href={`/companies?${new URLSearchParams({ ...resolved, verified: 'true' }).toString()}`}
                className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg ${resolved.verified === 'true' ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Verified Only
              </Link>
            </div>

            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Business Type</h4>
              <div className="space-y-1">
                <Link href="/companies" className={`block text-xs px-2 py-1.5 rounded-lg ${!resolved.businessType ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                  All Types
                </Link>
                {businessTypes.map((bt) => (
                  <Link
                    key={bt}
                    href={`/companies?${new URLSearchParams({ ...resolved, businessType: bt }).toString()}`}
                    className={`block text-xs px-2 py-1.5 rounded-lg ${resolved.businessType === bt ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {bt.replace(/_/g, ' ')}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Country</h4>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {countries.map((c) => (
                  <Link
                    key={c.id}
                    href={`/companies?${new URLSearchParams({ ...resolved, countryId: c.id }).toString()}`}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${resolved.countryId === c.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>{c.flag}</span> {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          {companies.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No companies found</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {companies.map((company) => (
                <Link
                  key={company.id}
                  href={`/companies/${company.slug}`}
                  className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {company.logo
                        ? <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
                        : <span className="text-xl font-bold text-blue-700">{company.name[0]}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-700 transition-colors truncate">
                          {company.name}
                        </h3>
                        {company.isVerified && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                        {company.isFeatured && (
                          <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0">Featured</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <MapPin className="w-3 h-3" />
                        {company.country?.flag} {company.country?.name}
                        <span className="text-gray-300">•</span>
                        {company.businessType.replace(/_/g, ' ')}
                      </div>
                      {company.mainProducts && (
                        <p className="text-xs text-gray-600 line-clamp-1 mb-2">{company.mainProducts}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" />{company._count.products} products</span>
                        <span>{company.totalInquiries} inquiries</span>
                        {company._count.reviews > 0 && <span>⭐ {company._count.reviews} reviews</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/companies?${new URLSearchParams({ ...resolved, page: String(p) }).toString()}`}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors ${p === page ? 'bg-blue-700 text-white' : 'border border-gray-200 hover:border-blue-300 text-gray-700'}`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
