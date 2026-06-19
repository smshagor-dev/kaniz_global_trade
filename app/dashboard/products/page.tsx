'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, del } from '@/lib/utils/api-client'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import {
  Package, Plus, Edit, Trash2, Eye, Loader2,
  Search, CheckCircle, Clock, XCircle, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { LoadingButton } from '@/components/ui/loading-button'

interface Product {
  id: string; name: string; slug: string; status: string
  createdAt: string; totalViews: number; totalInquiries: number
  images: { url: string }[]
  category: { name: string }
  priceMin?: number; priceMax?: number
  currency?: { symbol: string }
}

export default function DashboardProductsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Get user's company
  const { data: companyData } = useQuery({
    queryKey: ['my-company'],
    queryFn: () => get<{ id: string }[]>('/companies?myCompany=true'),
  })
  const companyId = (companyData?.data as unknown as { id: string }[])?.[0]?.id

  const { data, isLoading } = useQuery({
    queryKey: ['my-products', companyId, search, page],
    queryFn:  () => get<{ data: Product[]; meta: Record<string, number> }>(
      `/products?companyId=${companyId}&q=${search}&page=${page}&limit=20`
    ),
    enabled: !!companyId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] })
      toast.success('Product deleted')
      setDeleteId(null)
    },
    onError: () => toast.error('Delete failed'),
  })

  const products = (data?.data as unknown as { data: Product[] })?.data || []
  const meta     = (data?.data as unknown as { meta: { total: number; totalPages: number } })?.meta

  const statusConfig: Record<string, { label: string; icon: React.ElementType; class: string }> = {
    APPROVED:  { label: 'Approved',  icon: CheckCircle,  class: 'text-green-600 bg-green-50 border-green-200' },
    PENDING:   { label: 'Pending',   icon: Clock,        class: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    REJECTED:  { label: 'Rejected',  icon: XCircle,      class: 'text-red-600 bg-red-50 border-red-200' },
    SUSPENDED: { label: 'Suspended', icon: AlertCircle,  class: 'text-orange-600 bg-orange-50 border-orange-200' },
    DRAFT:     { label: 'Draft',     icon: Edit,         class: 'text-gray-600 bg-gray-50 border-gray-200' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your product catalog</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl py-16 text-center">
          <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No products yet</h3>
          <p className="text-gray-400 text-sm mt-1 mb-6">Add your first product to start receiving inquiries</p>
          <Link href="/dashboard/products/new" className="inline-flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors">
            <Plus className="w-4 h-4" /> Add First Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => {
            const sc = statusConfig[p.status] || statusConfig.DRAFT
            const StatusIcon = sc.icon
            return (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                  {p.images[0]
                    ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-gray-200" /></div>
                  }
                  <div className={`absolute top-2 left-2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.class}`}>
                    <StatusIcon className="w-3 h-3" />
                    {sc.label}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1">{p.category.name}</p>
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{p.name}</h3>
                  {p.priceMin && (
                    <p className="text-sm font-bold text-blue-700 mt-1">
                      {p.currency?.symbol}{Number(p.priceMin).toLocaleString()}
                      {p.priceMax && ` – ${p.currency?.symbol}${Number(p.priceMax).toLocaleString()}`}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>{p.totalViews} views</span>
                    <span>{p.totalInquiries} inquiries</span>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    <Link
                      href={`/products/${p.slug}`}
                      target="_blank"
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </Link>
                    <Link
                      href={`/dashboard/products/${p.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-blue-700 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Link>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="flex items-center justify-center px-2 text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 text-sm rounded-lg transition-colors ${page === p ? 'bg-blue-700 text-white' : 'border border-gray-200 hover:border-blue-300'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">Delete Product?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone. The product will be removed from the marketplace.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <LoadingButton
                onClick={() => deleteMutation.mutate(deleteId)}
                loading={deleteMutation.isPending}
                loadingText="Deleting..."
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                Delete
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
