'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

interface SampleOrder {
  id: string
  title: string
  totalAmount: number
  currencyCode: string
  status: string
  createdAt: string
  buyer: { firstName: string; lastName: string; email: string }
  supplierCompany: { name: string; slug: string }
  shipments: Array<{ id: string; carrier: string; trackingNumber: string; status: string }>
}

export default function AdminSampleOrdersPage() {
  const { data } = useQuery({
    queryKey: ['admin-sample-orders'],
    queryFn: () => get<SampleOrder[]>('/sample-orders?limit=100'),
  })

  const orders = (data?.data || []) as SampleOrder[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sample Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Admin visibility into pre-order sample requests and delivery flow.</p>
      </div>

      {orders.map((order) => (
        <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{order.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Buyer: {order.buyer.firstName} {order.buyer.lastName} | Supplier: {order.supplierCompany.name}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {order.currencyCode} {Number(order.totalAmount).toLocaleString()} | Shipments: {order.shipments.length}
              </p>
            </div>
            <div className="text-sm text-right">
              <p className="font-medium text-gray-900">{order.status}</p>
              <p className="text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      ))}

      {orders.length === 0 && <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">No sample orders found.</div>}
    </div>
  )
}
