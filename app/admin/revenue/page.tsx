'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { Loader2 } from 'lucide-react'

type RevenueLedgerItem = {
  id: string
  sourceType: string
  netAmount: number
  currency: string
  createdAt: string
}

type RevenueResponse = {
  items: RevenueLedgerItem[]
  summary: {
    totalPlatformRevenue: number
    revenueByServiceType: Array<{ sourceType: string; total: number }>
    monthlyChart: Array<{ month: string; total: number }>
    yearlyChart: Array<{ year: string; total: number }>
  }
}

export default function AdminRevenuePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue-ledgers'],
    queryFn: () => get<RevenueResponse>('/admin/revenue-ledgers'),
  })

  const payload = data?.data as RevenueResponse | undefined
  const summary = payload?.summary
  const rows = payload?.items || []
  const csvHref = useMemo(() => {
    if (!rows.length) return ''
    const header = 'id,sourceType,netAmount,currency,createdAt'
    const body = rows.map((item) => [item.id, item.sourceType, item.netAmount, item.currency, item.createdAt].join(',')).join('\n')
    return `data:text/csv;charset=utf-8,${encodeURIComponent(`${header}\n${body}`)}`
  }, [rows])

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-gray-100 bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Revenue dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              Track platform earnings by service type with immutable ledger records, reversal-safe totals, and export-ready rows.
            </p>
          </div>
          {csvHref ? (
            <a href={csvHref} download="platform-revenue-ledger.csv" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white">
              Export CSV
            </a>
          ) : null}
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Total platform revenue" value={summary?.totalPlatformRevenue || 0} />
            <MetricCard label="Revenue streams" value={(summary?.revenueByServiceType.length || 0)} integer />
            <MetricCard label="Monthly points" value={(summary?.monthlyChart.length || 0)} integer />
            <MetricCard label="Yearly points" value={(summary?.yearlyChart.length || 0)} integer />
          </div>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Revenue by service type</h2>
              <div className="mt-4 space-y-3">
                {(summary?.revenueByServiceType || []).map((row) => (
                  <div key={row.sourceType} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                    <span className="text-sm text-gray-700">{row.sourceType.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-semibold text-gray-900"><CurrencyAmount amount={row.total} currencyCode="USD" showCode /></span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Monthly chart data</h2>
              <div className="mt-4 space-y-3">
                {(summary?.monthlyChart || []).map((row) => (
                  <div key={row.month} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                    <span className="text-sm text-gray-700">{row.month}</span>
                    <span className="text-sm font-semibold text-gray-900"><CurrencyAmount amount={row.total} currencyCode="USD" showCode /></span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Revenue ledger rows</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Currency</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-gray-700">{row.sourceType.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900"><CurrencyAmount amount={row.netAmount} currencyCode={row.currency} showCode /></td>
                      <td className="px-4 py-3 text-gray-600">{row.currency}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(row.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length ? <div className="px-4 py-8 text-sm text-gray-500">No revenue ledger entries yet.</div> : null}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value, integer = false }: { label: string; value: number; integer?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-gray-900">
        {integer ? value : <CurrencyAmount amount={value} currencyCode="USD" showCode />}
      </p>
    </div>
  )
}
