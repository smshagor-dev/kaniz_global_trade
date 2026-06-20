import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { CurrencyRange } from '@/components/currency/currency-range'
import type { ReactNode } from 'react'

interface Props {
  searchParams: Promise<{ ids?: string }>
}

export default async function ComparePage({ searchParams }: Props) {
  const resolved = await searchParams
  const ids = (resolved.ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4)

  const products = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids }, status: 'APPROVED', deletedAt: null },
        include: {
          company: { select: { name: true, slug: true, verificationStatus: true } },
          category: { select: { name: true } },
          currency: { select: { symbol: true, code: true } },
          certificates: { select: { name: true } },
        },
      })
    : []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Product Comparison</h1>
        <p className="text-sm text-gray-500 mt-2">
          Compare up to four products side by side for price, MOQ, lead time, and certifications.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-sm text-gray-500">
          No products selected. Add ids in the URL like <code>?ids=prod1,prod2</code> or use compare links from product pages.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Field</th>
                {products.map((product) => (
                  <th key={product.id} className="px-4 py-3 text-left min-w-[220px]">
                    <Link href={`/products/${product.slug}`} className="font-semibold text-blue-700 hover:underline">
                      {product.name}
                    </Link>
                    <div className="text-xs text-gray-500 mt-1">{product.company.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Category', (product: (typeof products)[number]) => <>{product.category.name}</>],
                ['Supplier', (product: (typeof products)[number]) => <>{product.company.name}</>],
                [
                  'Price',
                  (product: (typeof products)[number]) =>
                    product.priceMin
                      ? <CurrencyRange minAmount={product.priceMin} maxAmount={product.priceMax} currencyCode={product.currency?.code} fallback="Negotiable" />
                      : <>Negotiable</>,
                ],
                ['MOQ', (product: (typeof products)[number]) => <>{product.moq ? `${Number(product.moq).toLocaleString()} ${product.moqUnit || ''}` : '-'}</>],
                ['Lead Time', (product: (typeof products)[number]) => <>{product.leadTime || '-'}</>],
                ['Packaging', (product: (typeof products)[number]) => <>{product.packagingDetails || '-'}</>],
                [
                  'Certifications',
                  (product: (typeof products)[number]) =>
                    <>{product.certificates.length ? product.certificates.map((cert) => cert.name).join(', ') : '-'}</>,
                ],
                ['Supplier Verification', (product: (typeof products)[number]) => <>{product.company.verificationStatus.replace(/_/g, ' ')}</>],
              ].map(([label, getter]) => (
                <tr key={label as string} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3 font-medium text-gray-700">{label as string}</td>
                  {products.map((product) => (
                    <td key={`${product.id}-${label as string}`} className="px-4 py-3 text-gray-600">
                      {(getter as (product: (typeof products)[number]) => ReactNode)(product)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
