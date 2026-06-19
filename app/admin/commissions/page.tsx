'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

interface CommissionResponse {
  items: Array<{
    id: string
    amount: number
    rate: number
    status: string
    currencyCode: string
    company: { name: string }
    tradeOrder?: { productName: string; status: string } | null
  }>
  totals: { amount: number; recognized: number }
}

export default function AdminCommissionsPage() {
  const { data } = useQuery({
    queryKey: ['admin-commissions'],
    queryFn: () => get<CommissionResponse>('/commissions'),
  })

  const response = data?.data as CommissionResponse | undefined
  const items = response?.items || []
  const totals = response?.totals || { amount: 0, recognized: 0 }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Commissions</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor commission-based marketplace revenue from successful trade orders.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Commission Pipeline</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${totals.amount.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-sm text-gray-500">Recognized Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${totals.recognized.toLocaleString()}</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{item.tradeOrder?.productName || 'Trade order'} | {item.company.name}</h2>
              <p className="text-sm text-gray-500">{item.rate}% | {item.currencyCode} {Number(item.amount).toLocaleString()}</p>
            </div>
            <p className="text-sm font-medium text-gray-900">{item.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
