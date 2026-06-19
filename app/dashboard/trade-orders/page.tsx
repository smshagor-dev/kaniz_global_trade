'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface TradeOrder {
  id: string
  productName: string
  status: string
  buyer: { firstName: string; lastName: string; email: string }
}

export default function SupplierTradeOrdersPage() {
  const { data, refetch } = useQuery({
    queryKey: ['supplier-trade-orders'],
    queryFn: () => get<TradeOrder[]>('/trade-orders'),
  })

  const [tracking, setTracking] = useState<Record<string, { carrier: string; trackingNumber: string }>>({})
  const [rating, setRating] = useState<Record<string, number>>({})

  async function createShipment(orderId: string) {
    const current = tracking[orderId]
    await post(`/trade-orders/${orderId}/shipment`, current)
    toast.success('Shipment created')
    refetch()
  }

  async function requestRelease(orderId: string) {
    await post(`/trade-orders/${orderId}/release`, { action: 'REQUEST_RELEASE' })
    toast.success('Release requested')
    refetch()
  }

  async function generateDocument(orderId: string, type: string) {
    await post(`/trade-orders/${orderId}/documents`, { type })
    toast.success(`${type.replace(/_/g, ' ')} generated`)
  }

  async function rateBuyer(orderId: string) {
    await post(`/trade-orders/${orderId}/rating`, {
      rating: rating[orderId] || 5,
      qualityRating: rating[orderId] || 5,
      communicationRating: rating[orderId] || 5,
      deliveryRating: rating[orderId] || 5,
      title: 'Supplier rating',
      comment: 'Buyer completed this trade order successfully.',
    })
    toast.success('Buyer rated')
  }

  const orders = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trade Assurance Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Manage escrow-backed orders, create shipments, and request fund release.</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="font-bold text-gray-900">{order.productName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {order.status} | Buyer: {order.buyer.firstName} {order.buyer.lastName} ({order.buyer.email})
            </p>

            <div className="grid md:grid-cols-3 gap-3 mt-4">
              <input
                placeholder="Carrier"
                value={tracking[order.id]?.carrier || ''}
                onChange={(e) => setTracking((prev) => ({ ...prev, [order.id]: { ...prev[order.id], carrier: e.target.value } }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="Tracking Number"
                value={tracking[order.id]?.trackingNumber || ''}
                onChange={(e) => setTracking((prev) => ({ ...prev, [order.id]: { ...prev[order.id], trackingNumber: e.target.value } }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button onClick={() => createShipment(order.id)} className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm">Ship Order</button>
                <button onClick={() => requestRelease(order.id)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Request Release</button>
                <button onClick={() => generateDocument(order.id, 'COMMERCIAL_INVOICE')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Commercial Invoice</button>
              </div>
            </div>

            {order.status === 'COMPLETED' && (
              <div className="mt-4 flex gap-2 items-center">
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={rating[order.id] || 5}
                  onChange={(e) => setRating((prev) => ({ ...prev, [order.id]: Number(e.target.value) }))}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <button onClick={() => rateBuyer(order.id)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Rate Buyer</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
