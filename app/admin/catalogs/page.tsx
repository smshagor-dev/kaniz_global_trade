'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { del, get } from '@/lib/utils/api-client'

interface CatalogItem {
  id: string
  name: string
  slug: string
  status: string
  isFeatured: boolean
  isVerified: boolean
  category: { name: string }
  subcategory?: { name: string } | null
  company: { name: string }
  images: Array<{ url: string }>
}

export default function AdminCatalogsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-catalogs', status, query],
    queryFn: () => get<CatalogItem[]>(`/admin/catalogs?status=${status}&q=${encodeURIComponent(query)}`),
  })
  const catalogs = (data?.data || []) as CatalogItem[]

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/admin/catalogs/${id}`),
    onSuccess: () => {
      toast.success('Catalog deleted')
      qc.invalidateQueries({ queryKey: ['admin-catalogs'] })
    },
    onError: (error: Error) => toast.error(error.message || 'Delete failed'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalog Management</h1>
          <p className="mt-1 text-sm text-gray-500">Create, edit, and curate marketplace catalog entries.</p>
        </div>
        <Link href="/admin/catalogs/new" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          <Plus className="h-4 w-4" />
          New catalog
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search catalog title, category, supplier..." className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
            <option value="">All statuses</option>
            {['APPROVED', 'PENDING', 'DRAFT', 'SUSPENDED', 'REJECTED'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {catalogs.map((catalog) => (
              <div key={catalog.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                  {catalog.images[0]?.url ? (
                    <img src={catalog.images[0].url} alt={catalog.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{catalog.status}</span>
                    {catalog.isFeatured && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">Featured</span>}
                    {catalog.isVerified && <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">Verified</span>}
                  </div>
                  <h3 className="line-clamp-2 text-lg font-bold text-gray-950">{catalog.name}</h3>
                  <p className="mt-2 text-sm text-gray-500">{catalog.company.name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {catalog.category.name}{catalog.subcategory?.name ? ` • ${catalog.subcategory.name}` : ''}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/products/${catalog.slug}`} target="_blank" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700">
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                    <Link href={`/admin/catalogs/${catalog.id}/edit`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                    <button onClick={() => deleteMutation.mutate(catalog.id)} className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!catalogs.length && (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                No catalogs found for the current filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
