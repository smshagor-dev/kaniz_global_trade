'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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

export default function DashboardRFQsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-rfqs'],
    queryFn: () => get<RFQ[]>('/rfqs?limit=50'),
  })

  const rfqs = data?.data || []
  const statusData = Object.entries(
    rfqs.reduce<Record<string, number>>((acc, rfq) => {
      acc[rfq.status] = (acc[rfq.status] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name: getRFQStatusMeta(name).shortLabel, value }))

  const summary = {
    total: rfqs.length,
    open: rfqs.filter((item) => item.status === 'OPEN').length,
    receiving: rfqs.filter((item) => item.status === 'RECEIVING_QUOTATIONS').length,
    totalQuotes: rfqs.reduce((sum, item) => sum + item._count.quotations, 0),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RFQs</h1>
        <p className="mt-1 text-sm text-gray-500">Browse active demand and see which buying requests are attracting quotations.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Visible RFQs', value: summary.total, icon: FileText, tone: 'bg-sky-50 text-sky-700' },
              { label: 'Open', value: summary.open, icon: Target, tone: 'bg-emerald-50 text-emerald-700' },
              { label: 'Receiving Quotes', value: summary.receiving, icon: ReceiptText, tone: 'bg-violet-50 text-violet-700' },
              { label: 'Total Quotations', value: summary.totalQuotes, icon: Globe2, tone: 'bg-amber-50 text-amber-700' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="mt-4 text-2xl font-bold text-gray-900">{item.value}</p>
                <p className="mt-1 text-sm text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">RFQ Status Trend</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Latest Demand Signals</h2>
                <Link href="/dashboard/quotations" className="text-sm font-medium text-blue-700">My quotations</Link>
              </div>
              <div className="space-y-3">
                {rfqs.map((rfq) => (
                  <div key={rfq.id} className="rounded-2xl border border-gray-100 p-4">
                    {(() => {
                      const rfqStatus = getRFQStatusMeta(rfq.status)
                      const quotationStatus = rfq.quotations?.[0] ? getQuotationStatusMeta(rfq.quotations[0].status) : null

                      return (
                        <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{rfq.productName}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {rfq.category?.name || 'General'} | {rfq.destinationCountry?.name || 'Destination not set'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rfqStatus.className}`}>{rfqStatus.shortLabel}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-600">
                      <p>Quantity: {rfq.quantity}</p>
                      <p>Quotes: {rfq._count.quotations}</p>
                      <p>
                        Budget: {rfq.currency?.code || 'USD'} {rfq.budget ? Number(rfq.budget).toLocaleString() : 'N/A'}
                      </p>
                      <p>Expires: {rfq.expiresAt ? new Date(rfq.expiresAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/rfqs/${rfq.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        Open RFQ
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      {quotationStatus ? (
                        <span className={`rounded-lg px-3 py-2 text-xs font-semibold ${quotationStatus.className}`}>
                          Your offer: {quotationStatus.shortLabel}
                        </span>
                      ) : (
                        <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                          Not quoted yet
                        </span>
                      )}
                    </div>
                        </>
                      )
                    })()}
                  </div>
                ))}
                {!rfqs.length && <p className="text-sm text-gray-500">No RFQs available right now.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
