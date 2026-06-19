'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { VisualSearchModal } from '@/components/public/home/visual-search-modal'

const TRENDING_TERMS = ['Textiles', 'Electronics', 'Machinery', 'Chemicals', 'Food & Beverage']

export function MarketplaceSearch() {
  const router = useRouter()
  const [scope, setScope] = useState<'products' | 'suppliers'>('products')
  const [query, setQuery] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = query.trim()
    const path = scope === 'suppliers' ? '/companies' : '/products'

    if (!normalized) {
      router.push(path)
      return
    }

    router.push(`${path}?q=${encodeURIComponent(normalized)}`)
  }

  return (
    <div className="max-w-3xl mx-auto mb-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl md:flex-row md:items-stretch"
      >
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value as 'products' | 'suppliers')}
          className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none md:min-w-[160px] md:border-b-0 md:border-r"
        >
          <option value="products">Products</option>
          <option value="suppliers">Suppliers</option>
        </select>

        <div className="flex min-w-0 flex-1 items-center">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, categories, catalogs, or suppliers..."
            className="min-w-0 flex-1 px-4 py-3 text-sm text-gray-900 outline-none"
          />
          <VisualSearchModal
            iconOnly
            label="Open AI visual search"
            buttonClassName="mx-2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm text-blue-200">
        {TRENDING_TERMS.map((term) => (
          <Link key={term} href={`/products?q=${encodeURIComponent(term)}`} className="hover:text-white hover:underline">
            {term}
          </Link>
        ))}
      </div>
    </div>
  )
}
