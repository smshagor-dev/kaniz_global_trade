import { Suspense } from 'react'
import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { Package, Filter, Search, CheckCircle, SlidersHorizontal } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse Products',
  description: 'Explore thousands of export/import products from verified global suppliers.',
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function normalizeParams(params: Record<string, string | string[] | undefined>) {
  const normalized: Record<string, string> = {}
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') normalized[key] = value
    else if (Array.isArray(value)) normalized[key] = value[0] || ''
  })
  return normalized
}

async function getProducts(params: Record<string, string>) {
  const page   = parseInt(params.page || '1')
  const limit  = 24
  const skip   = (page - 1) * limit

  const where: Record<string, unknown> = { status: 'APPROVED', deletedAt: null }
  if (params.categoryId) where.categoryId = params.categoryId
  if (params.companyId)  where.companyId  = params.companyId
  if (params.isFeatured === 'true') where.isFeatured = true
  if (params.q) {
    where.OR = [
      { name: { contains: params.q } },
      { shortDescription: { contains: params.q } },
    ]
  }
  if (params.minPrice) where.priceMin = { gte: parseFloat(params.minPrice) }
  if (params.maxPrice) where.priceMax = { lte: parseFloat(params.maxPrice) }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: params.sort === 'views' ? { totalViews: 'desc' }
        : params.sort === 'newest' ? { createdAt: 'desc' }
        : [{ isFeatured: 'desc' }, { totalViews: 'desc' }],
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        company: {
          select: {
            name: true, slug: true, verificationStatus: true,
            country: { select: { name: true, code: true } },
          },
        },
        category: { select: { name: true } },
        currency: { select: { code: true, symbol: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, _count: { select: { products: { where: { status: 'APPROVED' } } } } },
    }),
  ])
  return { products, total, categories, page, limit }
}

export default async function ProductsPage({ searchParams }: Props) {
  const resolved = normalizeParams(await searchParams)
  const { products, total, categories, page, limit } = await getProducts(resolved)
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Sidebar ── */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white border border-gray-100 rounded-xl p-5 sticky top-20">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </h3>

            {/* Categories */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Category</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <Link
                  href="/products"
                  className={`block text-sm px-2 py-1.5 rounded-lg transition-colors ${!resolved.categoryId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  All Categories
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?categoryId=${cat.id}`}
                    className={`flex items-center justify-between text-sm px-2 py-1.5 rounded-lg transition-colors ${resolved.categoryId === cat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-xs text-gray-400">({cat._count.products})</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Verification */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Supplier Type</h4>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" className="rounded text-blue-600" />
                <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Verified Only
              </label>
            </div>

            {/* Sort */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Sort By</h4>
              <div className="space-y-1">
                {[
                  ['', 'Relevance'],
                  ['views', 'Most Popular'],
                  ['newest', 'Newest First'],
                ].map(([val, label]) => (
                  <Link
                    key={val}
                    href={`/products?${new URLSearchParams({ ...resolved, sort: val }).toString()}`}
                    className={`block text-sm px-2 py-1.5 rounded-lg transition-colors ${(resolved.sort || '') === val ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {resolved.q ? `Results for "${resolved.q}"` : 'All Products'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} products found</p>
            </div>
          </div>

          {/* Grid */}
          {products.length === 0 ? (
            <div className="text-center py-24">
              <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No products found</h3>
              <p className="text-gray-400 mt-2">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                    {product.images[0] ? (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-200" />
                      </div>
                    )}
                    {product.isFeatured && (
                      <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">Featured</span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-blue-600 mb-1">{product.category.name}</p>
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{product.name}</h3>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs text-gray-500">{product.company.name}</span>
                      {product.company.verificationStatus === 'ADMIN_VERIFIED' && (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        {product.priceMin ? (
                          <span className="text-sm font-bold text-gray-900">
                            {product.currency?.symbol}{Number(product.priceMin).toLocaleString()}
                            {product.priceMax && ` – ${product.currency?.symbol}${Number(product.priceMax).toLocaleString()}`}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Price on request</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{product.company.country?.code}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/products?${new URLSearchParams({ ...resolved, page: String(p) }).toString()}`}
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
