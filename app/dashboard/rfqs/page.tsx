'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import Link from 'next/link'
import { ArrowRight, FileText, Globe2, Loader2, ReceiptText, Target } from 'lucide-react'
import { getQuotationStatusMeta, getRFQStatusMeta } from '@/lib/trade/status'

interface RFQ {
  id: string
  productName: string
  quantity: string
  status: string
  createdAt: string
  expiresAt?: string | null
  budget?: number | null
  buyer?: { firstName: string; lastName: string } | null
  category?: { name: string } | null
  destinationCountry?: { name: string } | null
  currency?: { code: string; symbol: string } | null
  _count: { quotations: number }
  quotations?: Array<{ id: string; status: string; createdAt: string }>
}

type RFQFilter = 'ALL' | 'NEW' | 'RECEIVING_QUOTATIONS' | 'AWARDED' | 'CLOSED'

export default function DashboardRFQsPage() {
  const [activeFilter, setActiveFilter] = useState<RFQFilter>('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-rfqs'],
    queryFn: () => get<RFQ[]>('/rfqs?limit=50'),
  })

  const rfqs = data?.data || []
  const filteredRFQs = useMemo(() => {
    if (activeFilter === 'ALL') return rfqs
    if (activeFilter === 'NEW') return rfqs.filter((item) => item._count.quotations === 0)
    return rfqs.filter((item) => item.status === activeFilter)
  }, [activeFilter, rfqs])

  const summary = {
    total: rfqs.length,
    open: rfqs.filter((item) => item.status === 'OPEN').length,
    receiving: rfqs.filter((item) => item.status === 'RECEIVING_QUOTATIONS').length,
    totalQuotes: rfqs.reduce((sum, item) => sum + item._count.quotations, 0),
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Demand tracking
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">RFQs</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#616b64]">
              Separate new RFQs from active quotation flow and review everything in a simpler table layout.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'NEW', label: 'New RFQ' },
              { key: 'RECEIVING_QUOTATIONS', label: 'Receiving' },
              { key: 'AWARDED', label: 'Awarded' },
              { key: 'CLOSED', label: 'Closed' },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key as RFQFilter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter.key
                    ? 'bg-[#243127] text-white'
                    : 'border border-[#d9ddd4] bg-white text-[#58635d] hover:border-[#c9d0c1]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Visible RFQs', value: summary.total, icon: FileText },
              { label: 'Open', value: summary.open, icon: Target },
              { label: 'Receiving quotes', value: summary.receiving, icon: ReceiptText },
              { label: 'Total quotations', value: summary.totalQuotes, icon: Globe2 },
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
            <div className="flex flex-col gap-2 border-b border-[#e7eae3] px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1f2937]">RFQ table</h2>
                <p className="mt-1 text-sm text-[#68726b]">{filteredRFQs.length} RFQs in this view</p>
              </div>
              <Link href="/dashboard/quotations" className="text-sm font-semibold text-[#3e5840] hover:text-[#243127]">
                Open my quotations
              </Link>
            </div>

            {filteredRFQs.length === 0 ? (
              <div className="px-6 py-12 text-sm text-[#68726b]">No RFQs match this filter right now.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#e7eae3] text-sm">
                  <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                    <tr>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Quantity</th>
                      <th className="px-6 py-4">Budget</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Your quote</th>
                      <th className="px-6 py-4">Expires</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1eb]">
                    {filteredRFQs.map((rfq) => {
                      const rfqStatus = getRFQStatusMeta(rfq.status)
                      const quotationStatus = rfq.quotations?.[0] ? getQuotationStatusMeta(rfq.quotations[0].status) : null

                      return (
                        <tr key={rfq.id} className="align-top">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-[#1f2937]">{rfq.productName}</p>
                            <p className="mt-1 text-xs text-[#738076]">
                              {rfq.destinationCountry?.name || 'Destination not set'}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-[#5f6862]">{rfq.category?.name || 'General'}</td>
                          <td className="px-6 py-4 text-[#5f6862]">{rfq.quantity}</td>
                          <td className="px-6 py-4 text-[#5f6862]">
                            {rfq.budget ? `${rfq.currency?.code || 'USD'} ${Number(rfq.budget).toLocaleString()}` : 'Not specified'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rfqStatus.className}`}>
                              {rfqStatus.shortLabel}
                            </span>
                            <p className="mt-2 max-w-[220px] text-xs text-[#738076]">{rfqStatus.description}</p>
                          </td>
                          <td className="px-6 py-4">
                            {quotationStatus ? (
                              <>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quotationStatus.className}`}>
                                  {quotationStatus.shortLabel}
                                </span>
                                <p className="mt-2 text-xs text-[#738076]">1 quotation submitted</p>
                              </>
                            ) : (
                              <span className="rounded-full bg-[#fff4de] px-2.5 py-1 text-xs font-semibold text-[#a66a00]">
                                Not sent
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-[#5f6862]">
                            {rfq.expiresAt ? new Date(rfq.expiresAt).toLocaleDateString() : 'Open'}
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={`/dashboard/rfqs/${rfq.id}`}
                              className="inline-flex items-center gap-1 font-semibold text-[#3e5840] hover:text-[#243127]"
                            >
                              Open RFQ
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
