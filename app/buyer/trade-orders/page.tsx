'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { CurrencyAmount } from '@/components/currency/currency-amount'

interface TradeOrder {
  id: string
  productName: string
  totalAmount: number
  currencyCode: string
  status: string
  escrowAccount?: { status: string }
}

export default function BuyerTradeOrdersPage() {
  const { data, refetch } = useQuery({
    queryKey: ['buyer-trade-orders'],
    queryFn: () => get<TradeOrder[]>('/trade-orders'),
  })
  const [disputeReason, setDisputeReason] = useState<Record<string, string>>({})
  const [rating, setRating] = useState<Record<string, number>>({})

  async function fund(orderId: string, method: 'STRIPE' | 'SSLCOMMERZ' | 'AAMARPAY' | 'NOWPAYMENTS') {
    const response = await post<{ checkoutUrl?: string }>(`/trade-orders/${orderId}/fund`, { method })
    const checkoutUrl = response.data?.checkoutUrl
    if (checkoutUrl) {
      window.location.href = checkoutUrl
      return
    }
    toast.success('Escrow funding started')
    refetch()
  }

  async function release(orderId: string) {
    await post(`/trade-orders/${orderId}/release`, { action: 'RELEASE' })
    toast.success('Escrow released')
    refetch()
  }

  async function dispute(orderId: string) {
    await post(`/trade-orders/${orderId}/dispute`, {
      reason: disputeReason[orderId] || 'Quality issue',
      description: disputeReason[orderId] || 'Buyer reported an issue with received goods.',
      evidenceUrls: [],
    })
    toast.success('Dispute opened')
    refetch()
  }

  async function generateDocument(orderId: string, type: string) {
    await post(`/trade-orders/${orderId}/documents`, { type })
    toast.success(`${type.replace(/_/g, ' ')} generated`)
  }

  async function rate(orderId: string) {
    await post(`/trade-orders/${orderId}/rating`, {
      rating: rating[orderId] || 5,
      qualityRating: rating[orderId] || 5,
      communicationRating: rating[orderId] || 5,
      deliveryRating: rating[orderId] || 5,
      title: 'Buyer rating',
      comment: 'Transaction completed through platform trade assurance.',
    })
    toast.success('Supplier rated')
  }

  async function reportFraud(orderId: string) {
    await post('/fraud-alerts', {
      tradeOrderId: orderId,
      reason: disputeReason[orderId] || 'Potential fraud',
      description: disputeReason[orderId] || 'Buyer requested admin review for this supplier.',
      evidenceUrls: [],
    })
    toast.success('Fraud alert submitted')
  }

  const orders = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trade Assurance Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Fund escrow, monitor status, release payment, or open a dispute.</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900">{order.productName}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  <CurrencyAmount amount={order.totalAmount} currencyCode={order.currencyCode} showCode /> | Order: {order.status} | Escrow: {order.escrowAccount?.status || 'N/A'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.status === 'PENDING_ESCROW_PAYMENT' && (
                  <>
                    <button onClick={() => fund(order.id, 'STRIPE')} className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm">Pay with Stripe</button>
                    <button onClick={() => fund(order.id, 'SSLCOMMERZ')} className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-sm">Pay with SSLCommerz</button>
                    <button onClick={() => fund(order.id, 'AAMARPAY')} className="px-3 py-2 rounded-lg bg-sky-700 text-white text-sm">Pay with aamarPay</button>
                    <button onClick={() => fund(order.id, 'NOWPAYMENTS')} className="px-3 py-2 rounded-lg bg-orange-600 text-white text-sm">Pay with NOWPayments</button>
                  </>
                )}
                {['DELIVERED', 'SHIPPED', 'ESCROW_FUNDED'].includes(order.status) && (
                  <button onClick={() => release(order.id)} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Release Payment</button>
                )}
                <button onClick={() => generateDocument(order.id, 'PROFORMA_INVOICE')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Proforma Invoice</button>
              </div>
            </div>

            {order.status !== 'COMPLETED' && (
              <div className="mt-4 flex gap-2">
                <input
                  placeholder="Dispute reason"
                  value={disputeReason[order.id] || ''}
                  onChange={(e) => setDisputeReason((prev) => ({ ...prev, [order.id]: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <button onClick={() => dispute(order.id)} className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm">Open Dispute</button>
                <button onClick={() => reportFraud(order.id)} className="px-3 py-2 rounded-lg border border-amber-200 text-amber-700 text-sm">Report Fraud</button>
              </div>
            )}

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
                <button onClick={() => rate(order.id)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Rate Supplier</button>
              </div>
            )}
          </div>
        ))}

        {orders.length === 0 && <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">No trade assurance orders yet.</div>}
      </div>
    </div>
  )
}
