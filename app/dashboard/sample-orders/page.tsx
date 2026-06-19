'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface SampleOrder {
  id: string
  title: string
  status: string
  buyer: { firstName: string; lastName: string; email: string }
}

export default function SupplierSampleOrdersPage() {
  const { data, refetch } = useQuery({
    queryKey: ['supplier-sample-orders'],
    queryFn: () => get<SampleOrder[]>('/sample-orders'),
  })
  const [tracking, setTracking] = useState<Record<string, { trackingCarrier: string; trackingNumber: string }>>({})

  async function update(id: string, action: string) {
    await patch(`/sample-orders/${id}`, { action, ...tracking[id] })
    toast.success(`Sample order ${action.toLowerCase()}ed`)
    refetch()
  }

  const orders = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sample Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Confirm paid sample requests, ship them, and provide tracking.</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="font-bold text-gray-900">{order.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{order.status} | Buyer: {order.buyer.firstName} {order.buyer.lastName} ({order.buyer.email})</p>

            <div className="grid md:grid-cols-3 gap-3 mt-4">
              <input
                placeholder="Carrier"
                value={tracking[order.id]?.trackingCarrier || ''}
                onChange={(e) => setTracking((prev) => ({ ...prev, [order.id]: { ...prev[order.id], trackingCarrier: e.target.value } }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="Tracking Number"
                value={tracking[order.id]?.trackingNumber || ''}
                onChange={(e) => setTracking((prev) => ({ ...prev, [order.id]: { ...prev[order.id], trackingNumber: e.target.value } }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => update(order.id, 'CONFIRM')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Confirm</button>
                <button onClick={() => update(order.id, 'REJECT')} className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm">Reject</button>
                <button onClick={() => update(order.id, 'SHIP')} className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm">Ship</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
