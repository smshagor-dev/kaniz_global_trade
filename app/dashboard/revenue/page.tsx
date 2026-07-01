'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { Loader2 } from 'lucide-react'

type TradeOrderRow = {
  id: string
  productName: string
  subtotal: number
  escrowFee: number
  platformCommissionAmount: number
  currencyCode: string
  status: string
}

export default function SupplierRevenuePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['supplier-revenue-orders'],
    queryFn: () => get<TradeOrderRow[]>('/trade-orders?limit=100'),
  })

  const items = (data?.data as TradeOrderRow[] | undefined) || []
  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.gross += Number(item.subtotal || 0)
        acc.platform += Number(item.platformCommissionAmount || 0)
        acc.escrow += Number(item.escrowFee || 0)
        acc.net += Number(item.subtotal || 0) - Number(item.platformCommissionAmount || 0)
        return acc
      },
      { gross: 0, platform: 0, escrow: 0, net: 0 }
    )
  }, [items])

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#1f2937]">Supplier finance</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
          Review gross order value, platform deductions, escrow charges, and estimated receivable values from live fee settings.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Gross orders', value: summary.gross },
          { label: 'Platform deduction', value: summary.platform },
          { label: 'Escrow fees', value: summary.escrow },
          { label: 'Net receivable', value: summary.net },
        ].map((item) => (
          <div key={item.label} className="rounded-[24px] border border-[#d9ddd4] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#68726b]">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-[#1f2937]">
              <CurrencyAmount amount={item.value} currencyCode="USD" showCode />
            </p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Order deduction breakdown</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e7eae3] text-sm">
              <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                <tr>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Gross order amount</th>
                  <th className="px-6 py-4">Platform deduction</th>
                  <th className="px-6 py-4">Escrow fee</th>
                  <th className="px-6 py-4">Net receivable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1eb]">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#1f2937]">{item.productName}</p>
                      <p className="mt-1 text-xs text-[#738076]">{item.status.replace(/_/g, ' ')}</p>
                    </td>
                    <td className="px-6 py-4"><CurrencyAmount amount={item.subtotal} currencyCode={item.currencyCode} showCode /></td>
                    <td className="px-6 py-4"><CurrencyAmount amount={item.platformCommissionAmount} currencyCode={item.currencyCode} showCode /></td>
                    <td className="px-6 py-4"><CurrencyAmount amount={item.escrowFee} currencyCode={item.currencyCode} showCode /></td>
                    <td className="px-6 py-4 font-semibold text-[#1f2937]">
                      <CurrencyAmount amount={Number(item.subtotal) - Number(item.platformCommissionAmount)} currencyCode={item.currencyCode} showCode />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length ? <div className="px-6 py-12 text-sm text-[#68726b]">No supplier revenue records yet.</div> : null}
          </div>
        )}
      </section>
    </div>
  )
}
