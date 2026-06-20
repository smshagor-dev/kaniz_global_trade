import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import type { Metadata } from 'next'
import { CatalogCard } from '@/components/public/home/catalog-card'

export const metadata: Metadata = {
  title: 'Browse Products',
  description: 'Explore marketplace catalogs across product categories, sub-categories, and suppliers.',
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
  const page = parseInt(params.page || '1')
  const limit = 16
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    status: 'APPROVED',
    deletedAt: null,
    category: { approvalStatus: 'APPROVED', isActive: true },
    AND: [
      {
        OR: [
          { subcategoryId: null },
          { subcategory: { approvalStatus: 'APPROVED', isActive: true } },
        ],
      },
    ],
  }
  if (params.categoryId) where.categoryId = params.categoryId
  if (params.subcategoryId) where.subcategoryId = params.subcategoryId
  if (params.companyId) where.companyId = params.companyId
  if (params.isFeatured === 'true') where.isFeatured = true
  if (params.verified === 'true') where.company = { verificationStatus: { in: ['ADMIN_VERIFIED', 'PREMIUM_VERIFIED'] } }
  if (params.q) {
    where.OR = [
      { name: { contains: params.q } },
      { shortDescription: { contains: params.q } },
      { category: { name: { contains: params.q } } },
      { subcategory: { name: { contains: params.q } } },
      { company: { name: { contains: params.q } } },
    ]
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: params.sort === 'newest'
        ? { createdAt: 'desc' }
        : params.sort === 'views'
          ? { totalViews: 'desc' }
          : [{ isFeatured: 'desc' }, { totalViews: 'desc' }, { createdAt: 'desc' }],
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        company: {
          select: {
            name: true,
            slug: true,
            verificationStatus: true,
            country: { select: { name: true, code: true } },
          },
        },
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        currency: { select: { symbol: true, code: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { isActive: true, approvalStatus: 'APPROVED' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        subcategories: { where: { isActive: true, approvalStatus: 'APPROVED' }, orderBy: { name: 'asc' } },
        _count: { select: { products: { where: { status: 'APPROVED', deletedAt: null } } } },
      },
    }),
  ])

  return { products, total, categories, page, limit }
}

export default async function ProductsPage({ searchParams }: Props) {
  const resolved = normalizeParams(await searchParams)
  const { products, total, categories, page, limit } = await getProducts(resolved)
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="w-full px-4 py-8 md:px-6 lg:px-8 2xl:px-10">
      <div className="grid gap-8 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-500">Marketplace filters</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Category</p>
                <div className="mt-2 space-y-2">
                  <Link href="/products" className={`block rounded-xl px-3 py-2 text-sm ${!resolved.categoryId ? 'bg-blue-50 font-semibold text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                    All categories
                  </Link>
                  {categories.map((category) => (
                    <div key={category.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <Link href={`/products?categoryId=${category.id}`} className={`block text-sm font-semibold ${resolved.categoryId === category.id ? 'text-blue-700' : 'text-gray-900'}`}>
                        {category.name}
                      </Link>
                      {category.subcategories.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {category.subcategories.slice(0, 6).map((subcategory) => (
                            <Link
                              key={subcategory.id}
                              href={`/products?categoryId=${category.id}&subcategoryId=${subcategory.id}`}
                              className={`rounded-full px-2.5 py-1 text-xs ${
                                resolved.subcategoryId === subcategory.id
                                  ? 'bg-blue-100 font-semibold text-blue-700'
                                  : 'bg-white text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {subcategory.name}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">Supplier type</p>
                <div className="mt-2">
                  <Link href={`/products?${new URLSearchParams({ ...resolved, verified: resolved.verified === 'true' ? '' : 'true' }).toString()}`} className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                    {resolved.verified === 'true' ? 'Show all suppliers' : 'Verified suppliers only'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-5">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Catalog listing</p>
                <h1 className="mt-1 text-3xl font-black tracking-[-0.03em] text-gray-950">
                  {resolved.q ? `Search results for "${resolved.q}"` : 'Marketplace products'}
                </h1>
                <p className="mt-2 text-sm text-gray-500">{total.toLocaleString()} results found</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ['', 'Relevance'],
                  ['views', 'Most viewed'],
                  ['newest', 'Newest'],
                ].map(([value, label]) => (
                  <Link
                    key={value}
                    href={`/products?${new URLSearchParams({ ...resolved, sort: value }).toString()}`}
                    className={`rounded-full px-3 py-2 text-sm font-medium ${(resolved.sort || '') === value ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {products.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <CatalogCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              No products found. Try another keyword, category, or sub-category.
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, index) => index + 1).map((nextPage) => (
                <Link
                  key={nextPage}
                  href={`/products?${new URLSearchParams({ ...resolved, page: String(nextPage) }).toString()}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold ${nextPage === page ? 'bg-blue-700 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:border-blue-300'}`}
                >
                  {nextPage}
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
