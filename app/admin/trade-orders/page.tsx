'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

interface TradeOrder {
  id: string
  productName: string
  totalAmount: number
  currencyCode: string
  status: string
  createdAt: string
  buyer: { firstName: string; lastName: string; email: string }
  supplierCompany: { name: string; slug: string }
  escrowAccount?: { status: string } | null
  shipments: Array<{ id: string; carrier: string; trackingNumber: string; status: string }>
  disputes: Array<{ id: string; status: string }>
}

export default function AdminTradeOrdersPage() {
  const { data } = useQuery({
    queryKey: ['admin-trade-orders'],
    queryFn: () => get<TradeOrder[]>('/trade-orders?limit=100'),
  })

  const orders = (data?.data || []) as TradeOrder[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trade Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Full escrow-backed trade order visibility for admin operations.</p>
      </div>

      {orders.map((order) => (
        <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{order.productName}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Buyer: {order.buyer.firstName} {order.buyer.lastName} | Supplier: {order.supplierCompany.name}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {order.currencyCode} {Number(order.totalAmount).toLocaleString()} | Escrow: {order.escrowAccount?.status || 'N/A'}
              </p>
            </div>
            <div className="text-sm text-right">
              <p className="font-medium text-gray-900">{order.status}</p>
              <p className="text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
              <p className="text-xs text-gray-400 mt-1">{order.shipments.length} shipments | {order.disputes.length} disputes</p>
            </div>
          </div>
        </div>
      ))}

      {orders.length === 0 && <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">No trade orders found.</div>}
    </div>
  )
}
