'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import {
  Package, CheckCircle, XCircle, Eye, Filter,
  Search, ChevronDown, Loader2, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  slug: string
  status: string
  createdAt: string
  images: { url: string }[]
  company: { id: string; name: string; slug: string; verificationStatus: string }
  category: { name: string }
}

export default function AdminProductsPage() {
  const qc = useQueryClient()
  const [status, setStatus]       = useState('PENDING')
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [rejectModal, setRejectModal] = useState<{ productId: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', status, search, page],
    queryFn:  () => get<{ data: Product[]; meta: { total: number; totalPages: number } }>(
      `/products?status=${status}&q=${search}&page=${page}&limit=20`
    ),
  })

  const approveMutation = useMutation({
    mutationFn: ({ productId, action, reason }: { productId: string; action: string; reason?: string }) =>
      post(`/products/${productId}/approve`, { action, reason }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success(`Product ${vars.action.toLowerCase()}d`)
      setRejectModal(null)
      setRejectReason('')
    },
    onError: () => toast.error('Action failed'),
  })

  const products = (data?.data as unknown as { data: Product[]; meta: { total: number; totalPages: number } })?.data || []
  const meta     = (data?.data as unknown as { data: Product[]; meta: { total: number; totalPages: number } })?.meta

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Approval</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve supplier products</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1) }}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${status === s ? 'bg-blue-700 text-white' : 'border border-gray-200 text-gray-600 hover:border-blue-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Submitted</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-16"><Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" /></td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-200" />
                No products found
              </td></tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {p.images[0]
                        ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                      }
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 truncate max-w-[200px]">{p.name}</p>
                      <Link href={`/products/${p.slug}`} target="_blank" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/companies/${p.company.slug}`} target="_blank" className="text-blue-700 hover:underline font-medium">
                    {p.company.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{p.company.verificationStatus.replace(/_/g, ' ')}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{p.category.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/products/${p.slug}`} target="_blank"
                      className="p-1.5 text-gray-400 hover:text-blue-700 rounded transition-colors">
                      <Eye className="w-4 h-4" />
                    </Link>
                    {p.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => approveMutation.mutate({ productId: p.id, action: 'APPROVE' })}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => setRejectModal({ productId: p.id, name: p.name })}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                    {p.status === 'APPROVED' && (
                      <button
                        onClick={() => approveMutation.mutate({ productId: p.id, action: 'SUSPEND' })}
                        disabled={approveMutation.isPending}
                        className="px-2.5 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors disabled:opacity-50"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Total: {meta.total} products</p>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs rounded-lg transition-colors ${page === p ? 'bg-blue-700 text-white' : 'border border-gray-200 hover:border-blue-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-gray-900 mb-1">Reject Product</h3>
            <p className="text-sm text-gray-500 mb-4">Rejecting: <strong>{rejectModal.name}</strong></p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason for rejection (required)..."
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectReason.trim()) { toast.error('Reason required'); return }
                  approveMutation.mutate({ productId: rejectModal.productId, action: 'REJECT', reason: rejectReason })
                }}
                disabled={approveMutation.isPending}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Reject Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
    APPROVED:  'bg-green-50 text-green-700 border border-green-200',
    REJECTED:  'bg-red-50 text-red-700 border border-red-200',
    SUSPENDED: 'bg-orange-50 text-orange-700 border border-orange-200',
    DRAFT:     'bg-gray-50 text-gray-600 border border-gray-200',
  }
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
