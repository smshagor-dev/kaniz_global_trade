'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import toast from 'react-hot-toast'
import { BadgeDollarSign, FileText, Loader2, ReceiptText, ShieldCheck } from 'lucide-react'

interface CommissionItem {
  id: string
  amount: number
  rate: number
  status: string
  currencyCode: string
  createdAt: string
  recognizedAt?: string | null
  settledAt?: string | null
  notes?: string | null
  company: { id: string; name: string; slug: string }
  buyer: { id: string; firstName: string; lastName: string; email: string }
  tradeOrder?: { id: string; productName: string; status: string; totalAmount: number; currencyCode: string } | null
}

interface CommissionResponse {
  items: CommissionItem[]
  totals: { amount: number; recognized: number }
  totalsByCurrency: Array<{ currencyCode: string; amount: number; recognized: number }>
}

type CommissionFilter = 'ALL' | 'PENDING' | 'ACCRUED' | 'SETTLED' | 'WAIVED'

export default function AdminCommissionsPage() {
  const [activeFilter, setActiveFilter] = useState<CommissionFilter>('ALL')
  const [statusDraft, setStatusDraft] = useState<Record<string, string>>({})
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin-commissions', activeFilter],
    queryFn: () => get<CommissionResponse>(`/commissions${activeFilter === 'ALL' ? '' : `?status=${activeFilter}`}`),
  })

  const response = data?.data as CommissionResponse | undefined
  const items = response?.items || []
  const totalsByCurrency = response?.totalsByCurrency || []
  const summary = useMemo(() => ({
    total: items.length,
    pending: items.filter((item) => item.status === 'PENDING').length,
    accrued: items.filter((item) => item.status === 'ACCRUED').length,
    settled: items.filter((item) => item.status === 'SETTLED').length,
  }), [items])

  async function saveCommission(item: CommissionItem) {
    const nextStatus = statusDraft[item.id] || item.status
    const nextNotes = notesDraft[item.id] ?? item.notes ?? ''

    setSavingId(item.id)
    try {
      await patch(`/commissions/${item.id}`, { status: nextStatus, notes: nextNotes })
      toast.success('Commission updated')
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update commission'
      toast.error(message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Kaniz Global Trade finance
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Platform commissions</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
              Monitor commission pipeline, review revenue recognition by currency, and move records through pending, accrued, settled, or waived states.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'PENDING', 'ACCRUED', 'SETTLED', 'WAIVED'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter as CommissionFilter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter
                    ? 'bg-[#243127] text-white'
                    : 'border border-[#d9ddd4] bg-white text-[#58635d] hover:border-[#c9d0c1]'
                }`}
              >
                {filter === 'ALL' ? 'All' : humanizeStatus(filter)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Records', value: summary.total, icon: FileText },
          { label: 'Pending', value: summary.pending, icon: ReceiptText },
          { label: 'Accrued', value: summary.accrued, icon: ShieldCheck },
          { label: 'Settled', value: summary.settled, icon: BadgeDollarSign },
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

      <section className="rounded-[28px] border border-[#d9ddd4] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1f2937]">Totals by currency</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {totalsByCurrency.map((entry) => (
            <div key={entry.currencyCode} className="rounded-[24px] border border-[#e4e7e0] bg-[#f7f8f5] p-4">
              <p className="text-sm font-semibold text-[#1f2937]">{entry.currencyCode}</p>
              <p className="mt-2 text-sm text-[#68726b]">
                Pipeline: <CurrencyAmount amount={entry.amount} currencyCode={entry.currencyCode} showCode />
              </p>
              <p className="mt-1 text-sm text-[#68726b]">
                Recognized: <CurrencyAmount amount={entry.recognized} currencyCode={entry.currencyCode} showCode />
              </p>
            </div>
          ))}
          {!totalsByCurrency.length ? <p className="text-sm text-[#68726b]">No commission totals yet.</p> : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Commission table</h2>
          <p className="mt-1 text-sm text-[#68726b]">{items.length} commission records in this view</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : !items.length ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No commission records found for this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1420px] divide-y divide-[#e7eae3] text-sm">
              <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                <tr>
                  <th className="px-6 py-4">Trade order</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4">Buyer</th>
                  <th className="px-6 py-4">Commission</th>
                  <th className="px-6 py-4">Rate</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Recognized</th>
                  <th className="px-6 py-4">Settled</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1eb]">
                {items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-[#fbfbf9]">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#1f2937]">{item.tradeOrder?.productName || 'Trade order'}</p>
                      <p className="mt-1 text-xs text-[#738076]">
                        {item.tradeOrder?.status ? humanizeStatus(item.tradeOrder.status) : 'No order status'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-[#5f6862]">{item.company.name}</td>
                    <td className="px-6 py-4 text-[#5f6862]">{item.buyer.firstName} {item.buyer.lastName}</td>
                    <td className="px-6 py-4 font-semibold text-[#1f2937]">
                      <CurrencyAmount amount={item.amount} currencyCode={item.currencyCode} showCode />
                    </td>
                    <td className="px-6 py-4 text-[#5f6862]">{item.rate}%</td>
                    <td className="px-6 py-4">
                      <select
                        value={statusDraft[item.id] || item.status}
                        onChange={(event) => setStatusDraft((current) => ({ ...current, [item.id]: event.target.value }))}
                        className="w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2 text-sm text-[#1f2937]"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="ACCRUED">Accrued</option>
                        <option value="SETTLED">Settled</option>
                        <option value="WAIVED">Waived</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-[#5f6862]">{item.recognizedAt ? new Date(item.recognizedAt).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-[#5f6862]">{item.settledAt ? new Date(item.settledAt).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4">
                      <textarea
                        rows={2}
                        value={notesDraft[item.id] ?? item.notes ?? ''}
                        onChange={(event) => setNotesDraft((current) => ({ ...current, [item.id]: event.target.value }))}
                        className="min-w-[220px] rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2 text-sm text-[#1f2937]"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => saveCommission(item)}
                        disabled={savingId === item.id}
                        className="rounded-2xl bg-[#243127] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d271f] disabled:opacity-50"
                      >
                        {savingId === item.id ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function humanizeStatus(value: string) {
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
