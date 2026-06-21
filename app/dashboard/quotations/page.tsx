'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import Link from 'next/link'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowRight, BadgeDollarSign, FileSignature, Loader2, Send, TimerReset } from 'lucide-react'
import { getQuotationStatusMeta } from '@/lib/trade/status'

interface Quotation {
  id: string
  status: string
  totalPrice: number
  currencyCode: string
  createdAt: string
  validUntil?: string | null
  deliveryTime?: string | null
  rfq?: { productName: string; quantity: string } | null
  inquiry?: { subject: string } | null
  company: { name: string }
  items: Array<{ id: string }>
  tradeOrder?: { id: string; status: string } | null
}

export default function DashboardQuotationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-quotations'],
    queryFn: () => get<Quotation[]>('/quotations?limit=50'),
  })

  const quotations = data?.data || []
  const statusData = Object.entries(
    quotations.reduce<Record<string, number>>((acc, quotation) => {
      acc[quotation.status] = (acc[quotation.status] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name: getQuotationStatusMeta(name).shortLabel, value }))

  const totalValue = quotations.reduce((sum, item) => sum + Number(item.totalPrice), 0)
  const summary = {
    total: quotations.length,
    sent: quotations.filter((item) => item.status === 'SENT').length,
    accepted: quotations.filter((item) => item.status === 'ACCEPTED').length,
    totalValue,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
        <p className="mt-1 text-sm text-gray-500">Monitor what you sent, what got accepted, and which offers need follow-up.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Total Quotations', value: summary.total, icon: FileSignature, tone: 'bg-sky-50 text-sky-700' },
              { label: 'Sent', value: summary.sent, icon: Send, tone: 'bg-amber-50 text-amber-700' },
              { label: 'Accepted', value: summary.accepted, icon: TimerReset, tone: 'bg-emerald-50 text-emerald-700' },
              { label: 'Quoted Value', value: <CurrencyAmount amount={summary.totalValue} currencyCode="USD" />, icon: BadgeDollarSign, tone: 'bg-violet-50 text-violet-700' },
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
              <h2 className="text-lg font-bold text-gray-900">Quotation Status</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Recent Offers</h2>
                <span className="text-sm text-gray-400">{quotations.length} records</span>
              </div>
              <div className="space-y-3">
                {quotations.map((quotation) => (
                  <div key={quotation.id} className="rounded-2xl border border-gray-100 p-4">
                    {(() => {
                      const statusMeta = getQuotationStatusMeta(quotation.status)

                      return (
                        <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {quotation.rfq?.productName || quotation.inquiry?.subject || 'Custom quotation'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {quotation.items.length} line items | Delivery: {quotation.deliveryTime || 'Not specified'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                        {statusMeta.shortLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">{statusMeta.description}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <p className="font-semibold text-gray-900"><CurrencyAmount amount={quotation.totalPrice} currencyCode={quotation.currencyCode} showCode /></p>
                      <p className="text-gray-500">
                        {quotation.validUntil ? `Valid until ${new Date(quotation.validUntil).toLocaleDateString()}` : new Date(quotation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/quotations/${quotation.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        Open detail
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      {quotation.tradeOrder ? (
                        <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                          Trade order: {quotation.tradeOrder.status}
                        </span>
                      ) : null}
                    </div>
                        </>
                      )
                    })()}
                  </div>
                ))}
                {!quotations.length && <p className="text-sm text-gray-500">No quotations submitted yet.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
