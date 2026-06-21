'use client'

import type { ComponentType, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  Calendar,
  FileText,
  Loader2,
  MapPin,
  Package,
  Quote,
  ReceiptText,
} from 'lucide-react'
import { get } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { RFQQuotationPanel } from '@/components/public/rfq-quotation-panel'
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

interface RFQDetail extends RFQListItem {
  access: string
}

export default function SupplierRFQRequestsPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<'OPEN' | 'PENDING' | 'QUOTED'>('OPEN')

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-rfq-requests'],
    queryFn: () => get<RFQListItem[]>('/rfqs?limit=100'),
  })

  const rfqs = useMemo(() => data?.data || [], [data?.data])
  const pendingRequests = useMemo(
    () => rfqs.filter((item) => !item.quotations?.length),
    [rfqs]
  )
  const quotedRequests = useMemo(
    () => rfqs.filter((item) => !!item.quotations?.length),
    [rfqs]
  )
  const filteredRequests = useMemo(() => {
    if (view === 'QUOTED') return quotedRequests
    if (view === 'PENDING') return pendingRequests
    return rfqs
  }, [pendingRequests, quotedRequests, rfqs, view])

  useEffect(() => {
    if (!filteredRequests.length) {
      setSelectedId(null)
      return
    }

    if (!selectedId || !filteredRequests.some((item) => item.id === selectedId)) {
      setSelectedId(filteredRequests[0].id)
    }
  }, [filteredRequests, selectedId])

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['supplier-rfq-request-detail', selectedId],
    queryFn: () => get<RFQDetail>(`/rfqs/${selectedId}`),
    enabled: !!selectedId,
  })

  const rfq = detailData?.data
  const statusMeta = rfq ? getRFQStatusMeta(rfq.status) : null
  const existingQuotation = rfq?.quotations?.[0] || null

  const summary = {
    total: rfqs.length,
    pending: pendingRequests.length,
    quoted: quotedRequests.length,
    responses: rfqs.reduce((sum, item) => sum + item._count.quotations, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFQ Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review incoming sourcing requests, compare requirements, and submit supplier quotations from one workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/quotations" className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-gray-300">
            My quotations
          </Link>
          <Link href="/dashboard/rfqs" className="inline-flex h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
            RFQ analytics
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'All requests', value: summary.total, tone: 'bg-sky-50 text-sky-700', icon: FileText },
          { label: 'Need quotation', value: summary.pending, tone: 'bg-amber-50 text-amber-700', icon: Quote },
          { label: 'Already quoted', value: summary.quoted, tone: 'bg-emerald-50 text-emerald-700', icon: ReceiptText },
          { label: 'Marketplace responses', value: summary.responses, tone: 'bg-violet-50 text-violet-700', icon: ArrowRight },
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

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Request Inbox</h2>
              <p className="mt-1 text-sm text-gray-500">{filteredRequests.length} visible requests</p>
            </div>
            <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold text-gray-600">
              {[
                { key: 'OPEN', label: 'All' },
                { key: 'PENDING', label: 'Need Quote' },
                { key: 'QUOTED', label: 'Quoted' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setView(tab.key as 'OPEN' | 'PENDING' | 'QUOTED')}
                  className={`rounded-lg px-3 py-2 transition ${
                    view === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-10 text-sm text-gray-500">
              No RFQ requests in this view right now.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredRequests.map((item) => {
                const rfqStatus = getRFQStatusMeta(item.status)
                const quoteStatus = item.quotations?.[0] ? getQuotationStatusMeta(item.quotations[0].status) : null
                const isActive = item.id === selectedId

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? 'border-blue-200 bg-blue-50/60 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${rfqStatus.className}`}>
                        {rfqStatus.shortLabel}
                      </span>
                      {quoteStatus ? (
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${quoteStatus.className}`}>
                          {quoteStatus.shortLabel}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          Awaiting your quote
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-gray-900">{item.productName}</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.category?.name || 'General'} | {item.destinationCountry?.name || 'Destination not set'}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <p>Qty: {item.quantity}{item.unit ? ` ${item.unit}` : ''}</p>
                      <p>Quotes: {item._count.quotations}</p>
                      <p>Budget: {item.budget ? `${item.currency?.code || 'USD'} ${Number(item.budget).toLocaleString()}` : 'N/A'}</p>
                      <p>Posted: {new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {detailLoading ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-12 shadow-sm">
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            </div>
          ) : !rfq ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-8 text-sm text-gray-500 shadow-sm">
              Select an RFQ request to review details and submit your quotation.
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {rfq.category ? (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {rfq.category.name}
                        </span>
                      ) : null}
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta?.className || 'bg-slate-100 text-slate-700'}`}>
                        {statusMeta?.label || rfq.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {rfq._count.quotations} quotations received
                      </span>
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">{rfq.productName}</h2>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600">
                      {statusMeta?.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/rfqs/${rfq.id}`} className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-gray-300">
                      Open detail page
                    </Link>
                    <Link href={`/rfqs/${rfq.id}`} className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                      Public RFQ page
                    </Link>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoCard icon={Package} label="Requested quantity" value={`${rfq.quantity}${rfq.unit ? ` ${rfq.unit}` : ''}`} />
                  <InfoCard
                    icon={MapPin}
                    label="Destination"
                    value={rfq.destinationCountry ? `${rfq.destinationCountry.flag ? `${rfq.destinationCountry.flag} ` : ''}${rfq.destinationCountry.name}` : 'Not specified'}
                  />
                  <InfoCard
                    icon={Quote}
                    label="Budget"
                    value={rfq.budget ? undefined : 'Not specified'}
                    content={rfq.budget ? <CurrencyAmount amount={rfq.budget} currencyCode={rfq.currency?.code} showCode /> : null}
                  />
                  <InfoCard
                    icon={Calendar}
                    label="Required by"
                    value={rfq.requiredDate ? new Date(rfq.requiredDate).toLocaleDateString() : 'Open'}
                  />
                  <InfoCard icon={FileText} label="Posted on" value={new Date(rfq.createdAt).toLocaleDateString()} />
                  <InfoCard
                    icon={Calendar}
                    label="Visible until"
                    value={rfq.expiresAt ? new Date(rfq.expiresAt).toLocaleDateString() : 'Active'}
                  />
                </div>
              </div>

              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_420px]">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-gray-900">Buyer requirements</h3>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      Request brief
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                    {rfq.description || 'The buyer has not added extra requirement notes for this RFQ yet.'}
                  </p>
                </div>

                <RFQQuotationPanel
                  rfq={{
                    id: rfq.id,
                    buyerId: rfq.buyerId,
                    productName: rfq.productName,
                    quantity: rfq.quantity,
                    unit: rfq.unit,
                    status: rfq.status,
                    currency: rfq.currency,
                  }}
                  existingQuotation={existingQuotation}
                  onSubmitted={() => {
                    qc.invalidateQueries({ queryKey: ['supplier-rfq-requests'] })
                    qc.invalidateQueries({ queryKey: ['supplier-rfq-request-detail', rfq.id] })
                    qc.invalidateQueries({ queryKey: ['dashboard-rfqs'] })
                    qc.invalidateQueries({ queryKey: ['dashboard-rfq-detail', rfq.id] })
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  label,
  value,
  icon: Icon,
  content,
}: {
  label: string
  value?: string
  icon: ComponentType<{ className?: string }>
  content?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Icon className="h-4 w-4 text-blue-600" />
        {label}
      </div>
      <div className="mt-2 text-sm text-gray-600">{content || value}</div>
    </div>
  )
}
