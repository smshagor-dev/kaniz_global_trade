'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { ComponentType, ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, FileText, Loader2, MapPin, Package, Quote } from 'lucide-react'
import { get } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { RFQQuotationPanel } from '@/components/public/rfq-quotation-panel'
import { getRFQStatusMeta } from '@/lib/trade/status'

interface SupplierRFQDetail {
  id: string
  buyerId: string
  productName: string
  quantity: string
  unit?: string | null
  budget?: number | null
  requiredDate?: string | null
  description?: string | null
  status: string
  createdAt: string
  expiresAt?: string | null
  access: string
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

export default function DashboardRFQDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-rfq-detail', id],
    queryFn: () => get<SupplierRFQDetail>(`/rfqs/${id}`),
    enabled: !!id,
  })

  const rfq = data?.data
  const existingQuotation = rfq?.quotations?.[0] || null
  const statusMeta = rfq ? getRFQStatusMeta(rfq.status) : null

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!rfq) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
        RFQ not found or no longer available.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard/rfqs" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Back to RFQs
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{rfq.productName}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Review buyer requirements and submit your supplier quotation from the dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/rfqs/${rfq.id}`} className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-gray-300">
            Public RFQ page
          </Link>
          <Link href="/dashboard/quotations" className="inline-flex h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
            My quotations
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {rfq.category ? (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {rfq.category.name}
                </span>
              ) : null}
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta?.className || 'bg-slate-100 text-slate-700'}`}>
                {statusMeta?.label || rfq.status}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {rfq._count.quotations} quotations
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-600">{statusMeta?.description}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <InfoCard icon={Package} label="Quantity" value={`${rfq.quantity}${rfq.unit ? ` ${rfq.unit}` : ''}`} />
              <InfoCard
                icon={MapPin}
                label="Delivery location"
                value={rfq.destinationCountry ? `${rfq.destinationCountry.flag ? `${rfq.destinationCountry.flag} ` : ''}${rfq.destinationCountry.name}` : 'Not specified'}
              />
              <InfoCard
                icon={Calendar}
                label="Deadline"
                value={rfq.requiredDate ? new Date(rfq.requiredDate).toLocaleDateString() : 'Open'}
              />
              <InfoCard
                icon={Quote}
                label="Budget"
                value={rfq.budget ? undefined : 'Not specified'}
                content={rfq.budget ? <CurrencyAmount amount={rfq.budget} currencyCode={rfq.currency?.code} showCode /> : null}
              />
              <InfoCard icon={FileText} label="Posted" value={new Date(rfq.createdAt).toLocaleDateString()} />
              <InfoCard
                icon={Calendar}
                label="Public visibility"
                value={rfq.expiresAt ? `Until ${new Date(rfq.expiresAt).toLocaleDateString()}` : 'Active'}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Requirements</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">
              {rfq.description || 'The buyer has not added extra requirement notes for this RFQ yet.'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
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
              qc.invalidateQueries({ queryKey: ['dashboard-rfq-detail', id] })
              qc.invalidateQueries({ queryKey: ['dashboard-rfqs'] })
            }}
          />
        </div>
      </div>
    </div>
  )
}
