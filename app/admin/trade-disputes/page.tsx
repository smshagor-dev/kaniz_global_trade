'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Dispute {
  id: string
  reason: string
  status: string
  refundAmount?: number | null
  tradeOrder: { productName: string; totalAmount?: number }
  buyer: { firstName: string; lastName: string; email: string }
  supplierCompany: { name: string }
}

export default function AdminTradeDisputesPage() {
  const [partialRefund, setPartialRefund] = useState<Record<string, string>>({})

  const { data, refetch } = useQuery({
    queryKey: ['admin-trade-disputes'],
    queryFn: () => get<Dispute[]>('/admin/trade-disputes'),
  })

  async function resolve(disputeId: string, resolution: 'BUYER_REFUND' | 'SUPPLIER_RELEASE' | 'PARTIAL_REFUND' | 'REJECT') {
    const refundAmount =
      resolution === 'PARTIAL_REFUND'
        ? Number(partialRefund[disputeId] || 0)
        : undefined
    await patch('/admin/trade-disputes', { disputeId, resolution, refundAmount })
    toast.success('Dispute resolved')
    refetch()
  }

  const disputes = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trade Disputes</h1>
        <p className="text-sm text-gray-500 mt-1">Resolve escrow claims and decide refund or release outcomes.</p>
      </div>

      <div className="space-y-4">
        {disputes.map((dispute) => (
          <div key={dispute.id} className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="font-bold text-gray-900">{dispute.tradeOrder.productName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Buyer: {dispute.buyer.firstName} {dispute.buyer.lastName} | Supplier: {dispute.supplierCompany.name}
            </p>
            <p className="text-sm text-gray-700 mt-2">{dispute.reason}</p>
            <p className="text-xs text-gray-500 mt-1">{dispute.status}</p>
            <div className="mt-3 max-w-xs">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Partial refund amount"
                value={partialRefund[dispute.id] || ''}
                onChange={(event) =>
                  setPartialRefund((current) => ({ ...current, [dispute.id]: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={() => resolve(dispute.id, 'BUYER_REFUND')} className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm">Refund Buyer</button>
              <button onClick={() => resolve(dispute.id, 'SUPPLIER_RELEASE')} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Release Supplier</button>
              <button onClick={() => resolve(dispute.id, 'PARTIAL_REFUND')} className="px-3 py-2 rounded-lg border border-yellow-200 text-yellow-700 text-sm">Partial Refund</button>
              <button onClick={() => resolve(dispute.id, 'REJECT')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Reject Claim</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
