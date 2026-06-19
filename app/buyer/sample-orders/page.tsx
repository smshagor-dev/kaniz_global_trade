'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, patch, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface SampleOrder {
  id: string
  title: string
  status: string
  totalAmount: number
  currencyCode: string
}

export default function BuyerSampleOrdersPage() {
  const { data, refetch } = useQuery({
    queryKey: ['buyer-sample-orders'],
    queryFn: () => get<SampleOrder[]>('/sample-orders'),
  })

  const [form, setForm] = useState({
    supplierCompanyId: '',
    title: '',
    quantity: 1,
    samplePrice: 25,
    shippingCost: 10,
    shippingAddress: '',
    paymentMethod: 'STRIPE',
  })

  async function createOrder() {
    const response = await post<{ checkoutUrl?: string }>('/sample-orders', { ...form, currencyCode: 'USD' })
    const checkoutUrl = response.data?.checkoutUrl
    if (checkoutUrl) {
      window.location.href = checkoutUrl
      return
    }
    toast.success('Sample order created')
    setForm({ supplierCompanyId: '', title: '', quantity: 1, samplePrice: 25, shippingCost: 10, shippingAddress: '', paymentMethod: 'STRIPE' })
    refetch()
  }

  async function markDelivered(id: string) {
    await patch(`/sample-orders/${id}`, { action: 'MARK_DELIVERED' })
    toast.success('Sample marked delivered')
    refetch()
  }

  const orders = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sample Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Pay for samples before bulk production and track supplier responses.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 grid md:grid-cols-2 gap-4">
        <input placeholder="Supplier Company ID" value={form.supplierCompanyId} onChange={(e) => setForm((p) => ({ ...p, supplierCompanyId: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Sample Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" placeholder="Sample Price" value={form.samplePrice} onChange={(e) => setForm((p) => ({ ...p, samplePrice: Number(e.target.value) }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" placeholder="Shipping Cost" value={form.shippingCost} onChange={(e) => setForm((p) => ({ ...p, shippingCost: Number(e.target.value) }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Shipping Address" value={form.shippingAddress} onChange={(e) => setForm((p) => ({ ...p, shippingAddress: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <select value={form.paymentMethod} onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2">
          <option value="STRIPE">Stripe Checkout</option>
          <option value="MANUAL">Manual Payment</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
        </select>
        <div className="md:col-span-2">
          <button onClick={createOrder} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm">Create Sample Order</button>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900">{order.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{order.currencyCode} {Number(order.totalAmount).toLocaleString()} | {order.status}</p>
            </div>
            {order.status === 'SHIPPED' && (
              <button onClick={() => markDelivered(order.id)} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Mark Delivered</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
