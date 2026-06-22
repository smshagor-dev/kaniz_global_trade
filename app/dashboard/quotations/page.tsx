'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import Link from 'next/link'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { BadgeDollarSign, FileSignature, Loader2, Send, TimerReset } from 'lucide-react'
import { getQuotationStatusMeta } from '@/lib/trade/status'

interface Quotation {
  id: string
  status: string
  totalPrice: number
  currencyCode: string
  createdAt: string
  validUntil?: string | null
  deliveryTime?: string | null
  rfq?: { id?: string; productName: string; quantity: string } | null
  inquiry?: { subject: string } | null
  company: { name: string }
  items: Array<{ id: string }>
  tradeOrder?: { id: string; status: string } | null
}

type QuotationFilter = 'ALL' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED'

export default function DashboardQuotationsPage() {
  const [activeFilter, setActiveFilter] = useState<QuotationFilter>('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-quotations'],
    queryFn: () => get<Quotation[]>('/quotations?limit=50'),
  })

  const quotations = data?.data || []
  const filteredQuotations = useMemo(() => {
    if (activeFilter === 'ALL') return quotations
    return quotations.filter((item) => item.status === activeFilter)
  }, [activeFilter, quotations])

  const totalValue = quotations.reduce((sum, item) => sum + Number(item.totalPrice), 0)
  const summary = {
    total: quotations.length,
    sent: quotations.filter((item) => item.status === 'SENT').length,
    accepted: quotations.filter((item) => item.status === 'ACCEPTED').length,
    totalValue,
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Offer tracking
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Quotations</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#616b64]">
              Separate sent, received, accepted, and rejected quotation flow in one simple table.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'SENT', label: 'Sent' },
              { key: 'VIEWED', label: 'Received' },
              { key: 'ACCEPTED', label: 'Accepted' },
              { key: 'REJECTED', label: 'Rejected' },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key as QuotationFilter)}
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
              { label: 'Total quotations', value: summary.total, icon: FileSignature },
              { label: 'Sent', value: summary.sent, icon: Send },
              { label: 'Accepted', value: summary.accepted, icon: TimerReset },
              { label: 'Quoted value', value: <CurrencyAmount amount={summary.totalValue} currencyCode="USD" />, icon: BadgeDollarSign },
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
            <div className="border-b border-[#e7eae3] px-6 py-5">
              <h2 className="text-lg font-semibold text-[#1f2937]">Quotation table</h2>
              <p className="mt-1 text-sm text-[#68726b]">{filteredQuotations.length} quotations in this view</p>
            </div>

            {filteredQuotations.length === 0 ? (
              <div className="px-6 py-12 text-sm text-[#68726b]">No quotations match this filter right now.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#e7eae3] text-sm">
                  <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                    <tr>
                      <th className="px-6 py-4">Quotation</th>
                      <th className="px-6 py-4">Company</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Delivery</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Validity</th>
                      <th className="px-6 py-4">Trade order</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1eb]">
                    {filteredQuotations.map((quotation) => {
                      const statusMeta = getQuotationStatusMeta(quotation.status)

                      return (
                        <tr key={quotation.id} className="align-top">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-[#1f2937]">
                              {quotation.rfq?.productName || quotation.inquiry?.subject || 'Custom quotation'}
                            </p>
                            <p className="mt-1 text-xs text-[#738076]">
                              {quotation.items.length} line items
                            </p>
                          </td>
                          <td className="px-6 py-4 text-[#5f6862]">{quotation.company.name}</td>
                          <td className="px-6 py-4 font-semibold text-[#1f2937]">
                            <CurrencyAmount amount={quotation.totalPrice} currencyCode={quotation.currencyCode} showCode />
                          </td>
                          <td className="px-6 py-4 text-[#5f6862]">{quotation.deliveryTime || 'Not specified'}</td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                              {statusMeta.shortLabel}
                            </span>
                            <p className="mt-2 max-w-[220px] text-xs text-[#738076]">{statusMeta.description}</p>
                          </td>
                          <td className="px-6 py-4 text-[#5f6862]">
                            {quotation.validUntil
                              ? new Date(quotation.validUntil).toLocaleDateString()
                              : new Date(quotation.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-[#5f6862]">
                            {quotation.tradeOrder ? quotation.tradeOrder.status : 'Not created'}
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={`/dashboard/quotations/${quotation.id}`}
                              className="font-semibold text-[#3e5840] hover:text-[#243127]"
                            >
                              Open detail
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
