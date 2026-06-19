import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, MapPin } from 'lucide-react'

type CatalogCardProduct = {
  id: string
  slug: string
  name: string
  moq?: number | string | { toString(): string } | null
  moqUnit?: string | null
  priceMin?: number | string | { toString(): string } | null
  priceMax?: number | string | { toString(): string } | null
  isFeatured?: boolean | null
  images?: Array<{ url: string; altText?: string | null; isPrimary?: boolean | null }>
  company: {
    name: string
    slug: string
    verificationStatus?: string | null
    country?: { name: string; code?: string | null } | null
  }
  category?: { name: string; slug?: string | null } | null
  subcategory?: { name: string; slug?: string | null } | null
  currency?: { symbol?: string | null; code?: string | null } | null
}

interface CatalogCardProps {
  product: CatalogCardProduct
}

function formatNumber(value?: number | string | { toString(): string } | null) {
  if (value == null || value === '') return null
  const numeric = Number(value.toString())
  if (Number.isNaN(numeric)) return String(value)
  return numeric.toLocaleString()
}

function formatPrice(product: CatalogCardProduct) {
  const min = formatNumber(product.priceMin)
  const max = formatNumber(product.priceMax)
  const symbol = product.currency?.symbol || '$'

  if (min && max && min !== max) return `${symbol}${min} - ${symbol}${max}`
  if (min) return `${symbol}${min}`
  if (max) return `${symbol}${max}`
  return 'Price on request'
}

export function CatalogCard({ product }: CatalogCardProps) {
  const image = product.images?.[0]?.url || '/placeholder-product.svg'
  const isVerified = ['ADMIN_VERIFIED', 'PREMIUM_VERIFIED', 'DOCUMENT_VERIFIED'].includes(product.company.verificationStatus || '')
  const location = product.company.country?.name || 'Global supplier'
  const moq = formatNumber(product.moq)

  return (
    <article className="group overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <Image
            src={image}
            alt={product.images?.[0]?.altText || product.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
          {product.isFeatured ? (
            <span className="absolute left-3 top-3 rounded-full bg-blue-700 px-3 py-1 text-[11px] font-semibold text-white">
              Featured
            </span>
          ) : null}
        </div>
      </Link>

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            {product.category?.name ? <span>{product.category.name}</span> : null}
            {product.subcategory?.name ? <span>{product.subcategory.name}</span> : null}
          </div>
          <Link href={`/products/${product.slug}`} className="line-clamp-2 text-lg font-bold leading-snug text-gray-950 transition group-hover:text-blue-700">
            {product.name}
          </Link>
        </div>

        <div className="rounded-2xl bg-gray-50 p-3">
          <p className="text-lg font-black text-gray-950">{formatPrice(product)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {moq ? `MOQ: ${moq} ${product.moqUnit || 'units'}` : 'MOQ available on request'}
          </p>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <Link href={`/companies/${product.company.slug}`} className="block font-semibold text-gray-900 transition hover:text-blue-700">
            {product.company.name}
          </Link>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>{location}</span>
          </div>
          {isVerified ? (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Verified supplier</span>
            </div>
          ) : null}
        </div>

        <div className="flex gap-3">
          <Link
            href={`/products/${product.slug}`}
            className="flex-1 rounded-xl bg-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            View details
          </Link>
          <Link
            href={`/companies/${product.company.slug}`}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            Supplier
          </Link>
        </div>
      </div>
    </article>
  )
}
