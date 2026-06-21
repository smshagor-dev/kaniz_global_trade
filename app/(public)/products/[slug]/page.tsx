import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { CheckCircle, Package, MessageSquare, FileText, Globe, Star, ArrowRight, Shield, Scale } from 'lucide-react'
import type { Metadata } from 'next'
import { InquiryForm } from '@/components/public/products/inquiry-form'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { CurrencyRange } from '@/components/currency/currency-range'
import { UserHistoryTracker } from '@/components/history/user-history-tracker'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { name: true, shortDescription: true, seoTitle: true, seoDescription: true, images: { where: { isPrimary: true }, take: 1 } },
  })
  if (!product) return { title: 'Product Not Found' }
  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription || '',
    openGraph: { images: product.images[0] ? [product.images[0].url] : [] },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await prisma.product.findFirst({
    where: {
      slug,
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
    },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      videos: true,
      variants: true,
      specifications: { orderBy: { sortOrder: 'asc' } },
      certificates: true,
      priceTiers: { orderBy: { minQty: 'asc' } },
      exportMarkets: { include: { country: { select: { name: true } } } },
      shippingMethods: { include: { shippingMethod: true } },
      paymentTerms: { include: { paymentTerm: true } },
      tradeTerms: { include: { tradeTerm: true } },
      category: { select: { id: true, name: true, slug: true } },
      currency: { select: { code: true, symbol: true } },
      company: {
        include: {
          country: { select: { name: true, code: true, flag: true } },
          _count: { select: { products: { where: { status: 'APPROVED' } }, reviews: true } },
        },
      },
    },
  })

  if (!product) notFound()

  // Related products
  const related = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      status: 'APPROVED',
      id: { not: product.id },
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
    },
    take: 4,
    include: { images: { where: { isPrimary: true }, take: 1 }, company: { select: { name: true } } },
  })

  return (
    <div className="w-full px-4 py-8 md:px-6 lg:px-8 2xl:px-10">
      <UserHistoryTracker
        payload={{
          type: 'VIEW',
          entityType: 'PRODUCT',
          entityId: product.id,
          productId: product.id,
          companyId: product.company.id,
          title: product.name,
          slug: product.slug,
          metadata: {
            categoryId: product.categoryId,
            companySlug: product.company.slug,
          },
        }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-700">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-blue-700">Products</Link>
        <span>/</span>
        <Link href={`/products?categoryId=${product.categoryId}`} className="hover:text-blue-700">{product.category.name}</Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: Images + Details ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="aspect-[16/9] bg-gray-50 relative">
              {product.images[0] ? (
                <img src={product.images[0].url} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-20 h-20 text-gray-200" />
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {product.images.map((img, i) => (
                  <div key={img.id} className="w-16 h-16 rounded-lg border-2 border-gray-200 overflow-hidden flex-shrink-0 cursor-pointer hover:border-blue-400">
                    <img src={img.url} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-blue-600 mb-1">{product.category.name}</p>
                <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                {product.sku && <p className="text-sm text-gray-500 mt-1">SKU: {product.sku}</p>}
              </div>
              <Link href={`/compare?ids=${product.id}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700">
                <Scale className="w-4 h-4" /> Compare
              </Link>
            </div>

            {/* Price */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              {product.priceMin ? (
                <p className="text-2xl font-bold text-gray-900">
                  <CurrencyRange minAmount={product.priceMin} maxAmount={product.priceMax} currencyCode={product.currency?.code} />
                  <span className="text-base font-normal text-gray-500 ml-1">/ {product.moqUnit || 'Unit'}</span>
                </p>
              ) : (
                <p className="text-lg font-semibold text-gray-600">Price negotiable — contact supplier</p>
              )}
              {product.moq && (
                <p className="text-sm text-gray-500 mt-1">
                  Min. Order: <strong>{Number(product.moq).toLocaleString()} {product.moqUnit}</strong>
                </p>
              )}
            </div>

            {/* Price tiers */}
            {product.priceTiers.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-sm">Price Tiers</h3>
                <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2">Quantity</th>
                      <th className="text-left px-3 py-2">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.priceTiers.map((tier) => (
                      <tr key={tier.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          {Number(tier.minQty).toLocaleString()}{tier.maxQty ? ` – ${Number(tier.maxQty).toLocaleString()}` : '+'}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <CurrencyAmount amount={tier.price} currencyCode={product.currency?.code} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Key details */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                ['Production Capacity', product.productionCapacity],
                ['Lead Time',          product.leadTime],
                ['Packaging',          product.packagingDetails],
                ['HS Code',            (product as Record<string, unknown>).hsCode ? 'N/A' : undefined],
              ].filter(([, val]) => val).map(([key, val]) => (
                <div key={key as string} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{key}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="font-semibold mb-2">Product Description</h3>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{product.description}</div>
              </div>
            )}
          </div>

          {/* Specifications */}
          {product.specifications.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">Specifications</h3>
              <table className="w-full text-sm">
                <tbody>
                  {product.specifications.map((spec) => (
                    <tr key={spec.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 text-gray-500 w-1/3">{spec.key}</td>
                      <td className="py-2 font-medium">{spec.value} {spec.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Shipping & Payment */}
          {(product.shippingMethods.length > 0 || product.paymentTerms.length > 0 || product.tradeTerms.length > 0) && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">Trade Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {product.shippingMethods.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Shipping Methods</p>
                    <div className="flex flex-wrap gap-1">
                      {product.shippingMethods.map((s) => (
                        <span key={s.shippingMethodId} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">{s.shippingMethod.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {product.paymentTerms.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Payment Terms</p>
                    <div className="flex flex-wrap gap-1">
                      {product.paymentTerms.map((p) => (
                        <span key={p.paymentTermId} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">{p.paymentTerm.code}</span>
                      ))}
                    </div>
                  </div>
                )}
                {product.tradeTerms.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Trade Terms (Incoterms)</p>
                    <div className="flex flex-wrap gap-1">
                      {product.tradeTerms.map((t) => (
                        <span key={t.tradeTermId} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">{t.tradeTerm.code}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {product.videos.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">Product Videos</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {product.videos.map((video) => (
                  <div key={video.id} className="space-y-2">
                    <video src={video.url} controls className="w-full rounded-xl bg-gray-100" />
                    <p className="text-sm text-gray-600">{video.title || product.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Supplier + Inquiry ── */}
        <div className="space-y-4">
          {/* Supplier card */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 sticky top-20">
            <h3 className="font-bold text-gray-900 mb-4">Supplier</h3>
            <Link href={`/companies/${product.company.slug}`} className="flex items-center gap-3 mb-4 group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center overflow-hidden">
                {(product.company as Record<string, unknown>).logo
                  ? <img src={(product.company as Record<string, unknown>).logo as string} alt={product.company.name} className="w-full h-full object-cover" />
                  : <span className="text-lg font-bold text-blue-700">{product.company.name[0]}</span>
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="font-semibold text-gray-900 group-hover:text-blue-700 text-sm">{product.company.name}</p>
                  {product.company.verificationStatus === 'ADMIN_VERIFIED' && (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500">{product.company.country?.name} {product.company.country?.flag}</p>
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-2 mb-4 text-center text-xs">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="font-bold text-gray-900">{product.company._count.products}</p>
                <p className="text-gray-500">Products</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="font-bold text-gray-900">{product.company._count.reviews}</p>
                <p className="text-gray-500">Reviews</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-4">
              <Shield className="w-3.5 h-3.5" />
              <span className="font-medium">{product.company.verificationStatus.replace(/_/g, ' ')}</span>
            </div>
            <Link href={`/companies/${product.company.slug}`} className="block text-center text-sm text-blue-700 border border-blue-700 rounded-lg py-2 hover:bg-blue-50 transition-colors mb-2">
              View Company Profile
            </Link>
          </div>

          {/* Inquiry form */}
          <div id="product-inquiry">
            <InquiryForm
              companyId={product.company.id}
              productId={product.id}
              productName={product.name}
            />
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                  {p.images[0]
                    ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-gray-200" /></div>
                  }
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.company.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
