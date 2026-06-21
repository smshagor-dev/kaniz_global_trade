'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Loader2, Plus } from 'lucide-react'
import { get } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { getRFQStatusMeta } from '@/lib/trade/status'

interface BuyerRFQ {
  id: string
  productName: string
  quantity: string
  unit?: string | null
  status: string
  budget?: number | null
  createdAt: string
  expiresAt?: string | null
  requiredDate?: string | null
  _count: { quotations: number }
  currency?: { code?: string | null } | null
}

export default function BuyerRFQsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['buyer-rfqs'],
    queryFn: () => get<BuyerRFQ[]>('/rfqs?limit=100'),
  })

  const rfqs = data?.data || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My RFQs</h1>
          <p className="mt-1 text-sm text-gray-500">Track every sourcing request you have posted and review supplier activity.</p>
        </div>
        <Link href="/rfqs/create" className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
          <Plus className="h-4 w-4" />
          Post new RFQ
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : rfqs.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
          You have not created any RFQs yet.
        </div>
      ) : (
        <div className="space-y-4">
          {rfqs.map((rfq) => {
            const statusMeta = getRFQStatusMeta(rfq.status)

            return (
            <div key={rfq.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                      {statusMeta.shortLabel}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {rfq._count.quotations} quotations
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-gray-900">{rfq.productName}</h2>
                  <p className="mt-2 text-sm text-gray-500">{statusMeta.description}</p>
                  <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
                    <p>Quantity: {rfq.quantity}{rfq.unit ? ` ${rfq.unit}` : ''}</p>
                    <p>Budget: <CurrencyAmount amount={rfq.budget} currencyCode={rfq.currency?.code} showCode /></p>
                    <p>Created: {new Date(rfq.createdAt).toLocaleDateString()}</p>
                    <p>Deadline: {rfq.requiredDate ? new Date(rfq.requiredDate).toLocaleDateString() : 'Not set'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/buyer/rfqs/${rfq.id}`} className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                    View detail
                  </Link>
                  <Link href={`/rfqs/${rfq.id}`} className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-gray-300">
                    Public page
                  </Link>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
                Visible until {rfq.expiresAt ? new Date(rfq.expiresAt).toLocaleDateString() : 'manually closed'}
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
