import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { CheckCircle, Package, Star, Scale, Shield } from 'lucide-react'
import type { Metadata } from 'next'
import { InquiryForm } from '@/components/public/products/inquiry-form'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { CurrencyRange } from '@/components/currency/currency-range'
import { UserHistoryTracker } from '@/components/history/user-history-tracker'
import { VideoPlayer } from '@/components/media/video-player'
import { RatingSummaryLabel } from '@/components/public/rating-summary'
import { TrustBadge } from '@/components/public/trust-badge'
import { trackProductView } from '@/lib/analytics/tracking'
import { getCompanyRatingSummary, getProductRatingSummary, getRecentProductRatings } from '@/lib/ratings/public'

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
      documents: true,
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
          _count: { select: { products: { where: { status: 'APPROVED' } } } },
        },
      },
    },
  })

  if (!product) notFound()

  const [related, productRatingSummary, companyRatingSummary, productReviews] = await Promise.all([
    prisma.product.findMany({
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
    }),
    getProductRatingSummary(product.id),
    getCompanyRatingSummary(product.company.id),
    getRecentProductRatings(product.id),
  ])

  trackProductView(product.id, product.company.id).catch(() => {})

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

      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-blue-700">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-blue-700">Products</Link>
        <span>/</span>
        <Link href={`/products?categoryId=${product.categoryId}`} className="hover:text-blue-700">{product.category.name}</Link>
        <span>/</span>
        <span className="max-w-[200px] truncate text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <div className="relative aspect-[16/9] bg-gray-50">
              {product.images[0] ? (
                <img src={product.images[0].url} alt={product.name} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-20 w-20 text-gray-200" />
                </div>
              )}
            </div>
            {product.images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto p-3">
                {product.images.map((img, index) => (
                  <div key={img.id} className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 border-gray-200">
                    <img src={img.url} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-sm text-blue-600">{product.category.name}</p>
                <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                {product.sku ? <p className="mt-1 text-sm text-gray-500">SKU: {product.sku}</p> : null}
                <RatingSummaryLabel summary={productRatingSummary} noun="ratings" className="mt-2" />
              </div>
              <Link href={`/compare?ids=${product.id}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700">
                <Scale className="h-4 w-4" /> Compare
              </Link>
            </div>

            <div className="mb-6 rounded-xl bg-gray-50 p-4">
              {product.priceMin ? (
                <p className="text-2xl font-bold text-gray-900">
                  <CurrencyRange minAmount={product.priceMin} maxAmount={product.priceMax} currencyCode={product.currency?.code} />
                  <span className="ml-1 text-base font-normal text-gray-500">/ {product.moqUnit || 'Unit'}</span>
                </p>
              ) : (
                <p className="text-lg font-semibold text-gray-600">Price negotiable, contact supplier</p>
              )}
              {product.moq ? (
                <p className="mt-1 text-sm text-gray-500">
                  Min. Order: <strong>{Number(product.moq).toLocaleString()} {product.moqUnit}</strong>
                </p>
              ) : null}
            </div>

            {product.priceTiers.length > 0 ? (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold">Price Tiers</h3>
                <table className="w-full overflow-hidden rounded-lg border border-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Quantity</th>
                      <th className="px-3 py-2 text-left">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.priceTiers.map((tier) => (
                      <tr key={tier.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          {Number(tier.minQty).toLocaleString()}{tier.maxQty ? ` - ${Number(tier.maxQty).toLocaleString()}` : '+'}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {tier.priceMax ? (
                            <CurrencyRange minAmount={tier.priceMin} maxAmount={tier.priceMax} currencyCode={product.currency?.code} />
                          ) : (
                            <CurrencyAmount amount={tier.priceMin} currencyCode={product.currency?.code} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="mb-6 grid grid-cols-2 gap-3">
              {[
                ['Production Capacity', product.productionCapacity],
                ['Lead Time', product.leadTime],
                ['Packaging', product.packagingDetails],
              ].filter(([, value]) => value).map(([label, value]) => (
                <div key={label as string} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {product.description ? (
              <div>
                <h3 className="mb-2 font-semibold">Product Description</h3>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{product.description}</div>
              </div>
            ) : null}
          </div>

          {product.specifications.length > 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-6">
              <h3 className="mb-4 font-bold text-gray-900">Specifications</h3>
              <table className="w-full text-sm">
                <tbody>
                  {product.specifications.map((spec) => (
                    <tr key={spec.id} className="border-b border-gray-50 last:border-0">
                      <td className="w-1/3 py-2 text-gray-500">{spec.key}</td>
                      <td className="py-2 font-medium">{spec.value} {spec.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {(product.shippingMethods.length > 0 || product.paymentTerms.length > 0 || product.tradeTerms.length > 0) ? (
            <div className="rounded-xl border border-gray-100 bg-white p-6">
              <h3 className="mb-4 font-bold text-gray-900">Trade Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {product.shippingMethods.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs text-gray-500">Shipping Methods</p>
                    <div className="flex flex-wrap gap-1">
                      {product.shippingMethods.map((item) => (
                        <span key={item.shippingMethodId} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{item.shippingMethod.name}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {product.paymentTerms.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs text-gray-500">Payment Terms</p>
                    <div className="flex flex-wrap gap-1">
                      {product.paymentTerms.map((item) => (
                        <span key={item.paymentTermId} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{item.paymentTerm.code}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {product.tradeTerms.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs text-gray-500">Trade Terms</p>
                    <div className="flex flex-wrap gap-1">
                      {product.tradeTerms.map((item) => (
                        <span key={item.tradeTermId} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{item.tradeTerm.code}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {product.videos.length > 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-6">
              <h3 className="mb-4 font-bold text-gray-900">Product Videos</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {product.videos.map((video) => (
                  <div key={video.id} className="space-y-2">
                    <VideoPlayer
                      url={video.url}
                      title={video.title || product.name}
                      poster={video.thumbnailUrl}
                      className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100"
                      videoClassName="h-full w-full bg-gray-100 object-cover"
                    />
                    <p className="text-sm text-gray-600">{video.title || product.name}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {product.documents.length > 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-6">
              <h3 className="mb-4 font-bold text-gray-900">Catalogs & Documents</h3>
              <div className="space-y-3">
                {product.documents.map((document) => (
                  <a
                    key={document.id}
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
                  >
                    <span className="truncate font-medium">{document.name}</span>
                    <span className="ml-3 shrink-0 text-xs font-semibold text-blue-700">Open PDF</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="sticky top-20 rounded-xl border border-gray-100 bg-white p-5">
            <h3 className="mb-4 font-bold text-gray-900">Supplier</h3>
            <Link href={`/companies/${product.company.slug}`} className="group mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
                {product.company.logo ? (
                  <img src={product.company.logo} alt={product.company.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-blue-700">{product.company.name[0]}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{product.company.name}</p>
                  {product.company.verificationStatus === 'ADMIN_VERIFIED' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : null}
                </div>
                <p className="text-xs text-gray-500">{product.company.country?.name} {product.company.country?.flag}</p>
              </div>
            </Link>
            <div className="mb-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="font-bold text-gray-900">{product.company._count.products}</p>
                <p className="text-gray-500">Products</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="font-bold text-gray-900">{companyRatingSummary.count}</p>
                <p className="text-gray-500">Ratings</p>
              </div>
            </div>
            <RatingSummaryLabel summary={companyRatingSummary} noun="people" className="mb-4" />
            <div className="mb-4 flex flex-wrap gap-2">
              {product.company.fraudPublicFlag ? <TrustBadge flag={product.company.fraudPublicFlag} /> : null}
              <div className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600">
                <Shield className="h-3.5 w-3.5" />
                <span className="font-medium">{product.company.verificationStatus.replace(/_/g, ' ')}</span>
              </div>
            </div>
            <Link href={`/companies/${product.company.slug}`} className="mb-2 block rounded-lg border border-blue-700 py-2 text-center text-sm text-blue-700 transition-colors hover:bg-blue-50">
              View Company Profile
            </Link>
          </div>

          <div id="product-inquiry">
            <InquiryForm companyId={product.company.id} productId={product.id} productName={product.name} />
          </div>
        </div>
      </div>

      {productReviews.length > 0 ? (
        <section className="mt-12 rounded-xl border border-gray-100 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">Product ratings</h2>
            <RatingSummaryLabel summary={productRatingSummary} noun="ratings" />
          </div>
          <div className="mt-6 space-y-4">
            {productReviews.map((review) => (
              <div key={review.id} className="border-b border-gray-50 pb-4 last:border-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {review.authorUser.firstName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{review.authorUser.firstName} {review.authorUser.lastName}</p>
                    <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star key={index} className={`h-4 w-4 ${index < review.rating ? 'fill-[#f4b740] text-[#f4b740]' : 'text-gray-200'}`} />
                    ))}
                  </div>
                </div>
                {review.title ? <p className="mt-3 text-sm font-semibold text-gray-900">{review.title}</p> : null}
                {review.comment ? <p className="mt-1 text-sm leading-6 text-gray-600">{review.comment}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Related Products</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((item) => (
              <Link key={item.id} href={`/products/${item.slug}`} className="group overflow-hidden rounded-xl border border-gray-100 transition-shadow hover:shadow-md">
                <div className="aspect-[4/3] overflow-hidden bg-gray-50">
                  {item.images[0] ? (
                    <img src={item.images[0].url} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><Package className="h-8 w-8 text-gray-200" /></div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{item.company.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
