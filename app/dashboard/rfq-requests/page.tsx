'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronRight,
  FileText,
  Loader2,
  Quote,
  ReceiptText,
} from 'lucide-react'
import { get } from '@/lib/utils/api-client'
import { getQuotationStatusMeta, getRFQStatusMeta } from '@/lib/trade/status'

interface RFQListItem {
  id: string
  buyerId: string
  productName: string
  quantity: string
  unit?: string | null
  status: string
  createdAt: string
  expiresAt?: string | null
  budget?: number | null
  requiredDate?: string | null
  description?: string | null
  category?: { id: string; name: string } | null
  destinationCountry?: { id: string; name: string; code: string; flag?: string | null } | null
  currency?: { id?: string; code?: string | null; symbol?: string | null } | null
  _count: { quotations: number }
  quotations?: Array<{
    id: string
    status: string
    createdAt: string
    totalPrice?: number
    currencyCode?: string
  }>
}

type RequestFilter = 'ALL' | 'NEW' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED'

export default function SupplierRFQRequestsPage() {
  const [view, setView] = useState<RequestFilter>('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-rfq-requests'],
    queryFn: () => get<RFQListItem[]>('/rfqs?limit=100'),
  })

  const rfqs = useMemo(() => data?.data || [], [data?.data])
  const filteredRequests = useMemo(() => {
    if (view === 'ALL') return rfqs
    if (view === 'NEW') return rfqs.filter((item) => !item.quotations?.length)
    return rfqs.filter((item) => item.quotations?.[0]?.status === view)
  }, [rfqs, view])

  const summary = {
    total: rfqs.length,
    pending: rfqs.filter((item) => !item.quotations?.length).length,
    quoted: rfqs.filter((item) => !!item.quotations?.length).length,
    responses: rfqs.reduce((sum, item) => sum + item._count.quotations, 0),
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Supplier workspace
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">RFQ requests</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#616b64]">
              Track new requests and separate sent, received, accepted, and rejected quotation flow in one full-width table.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Link href="/dashboard/quotations" className="rounded-2xl border border-[#d9ddd4] bg-[#f7f8f5] px-4 py-4 text-sm font-semibold text-[#1f2937] transition hover:border-[#c9d0c1]">
              Open my quotations
            </Link>
            <Link href="/dashboard/rfqs" className="rounded-2xl bg-[#243127] px-4 py-4 text-sm font-semibold text-white transition hover:bg-[#1d271f]">
              View RFQ analytics
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'All requests', value: summary.total, icon: FileText },
          { label: 'Need quotation', value: summary.pending, icon: Quote },
          { label: 'Already quoted', value: summary.quoted, icon: ReceiptText },
          { label: 'Responses in market', value: summary.responses, icon: ChevronRight },
        ].map((item) => (
          <div key={item.label} className="rounded-[24px] border border-[#d9ddd4] bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f5ef] text-[#4f5d49]">
              <item.icon className="h-4 w-4" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-[#1f2937]">{item.value}</p>
            <p className="mt-1 text-sm text-[#68726b]">{item.label}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#e7eae3] px-6 py-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1f2937]">Request table</h2>
              <p className="mt-1 text-sm text-[#68726b]">{filteredRequests.length} requests in this view</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'NEW', label: 'New' },
                { key: 'SENT', label: 'Sent' },
                { key: 'VIEWED', label: 'Received' },
                { key: 'ACCEPTED', label: 'Accepted' },
                { key: 'REJECTED', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setView(tab.key as RequestFilter)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    view === tab.key
                      ? 'bg-[#243127] text-white'
                      : 'border border-[#d9ddd4] bg-white text-[#58635d] hover:border-[#c9d0c1]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-[#4f5d49]" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No RFQ requests in this view right now.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e7eae3] text-sm">
              <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Budget</th>
                  <th className="px-6 py-4">RFQ status</th>
                  <th className="px-6 py-4">Your status</th>
                  <th className="px-6 py-4">Posted</th>
                  <th className="px-6 py-4">Expires</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1eb]">
                {filteredRequests.map((item) => {
                  const rfqStatus = getRFQStatusMeta(item.status)
                  const quoteStatus = item.quotations?.[0] ? getQuotationStatusMeta(item.quotations[0].status) : null

                  return (
                    <tr key={item.id} className="align-top hover:bg-[#fbfbf9]">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1f2937]">{item.productName}</p>
                        <p className="mt-1 text-xs text-[#738076]">{item._count.quotations} quotations received</p>
                      </td>
                      <td className="px-6 py-4 text-[#5f6862]">{item.category?.name || 'General'}</td>
                      <td className="px-6 py-4 text-[#5f6862]">{item.destinationCountry?.name || 'Destination not set'}</td>
                      <td className="px-6 py-4 text-[#5f6862]">
                        {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                      </td>
                      <td className="px-6 py-4 text-[#5f6862]">
                        {item.budget ? `${item.currency?.code || 'USD'} ${Number(item.budget).toLocaleString()}` : 'Not specified'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rfqStatus.className}`}>
                          {rfqStatus.shortLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {quoteStatus ? (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quoteStatus.className}`}>
                            {quoteStatus.shortLabel}
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#fff4de] px-2.5 py-1 text-xs font-semibold text-[#a66a00]">
                            New
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#5f6862]">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-[#5f6862]">
                        {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'Active'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <Link href={`/dashboard/rfqs/${item.id}`} className="font-semibold text-[#3e5840] hover:text-[#243127]">
                            Open details
                          </Link>
                          <Link href={`/rfqs/${item.id}`} className="text-xs font-medium text-[#68726b] hover:text-[#243127]">
                            Public page
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
