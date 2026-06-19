'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import { Loader2, Wallet } from 'lucide-react'

interface PaymentLedgerResponse {
  payments: Array<{
    id: string
    amount: number
    currency: string
    method: string
    status: string
    createdAt: string
    invoice?: { invoiceNumber: string } | null
    tradeOrder?: { productName: string } | null
    sampleOrder?: { title: string } | null
  }>
}

export default function DashboardPaymentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['billing-payments'],
    queryFn: () => get<PaymentLedgerResponse & { payments: PaymentLedgerResponse['payments'] }>('/billing'),
  })

  const payments = data?.data?.payments || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-gray-500 mt-1">Track successful, pending, and failed payment attempts across your account.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No payment records yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {payments.map((payment) => (
              <div key={payment.id} className="p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {payment.invoice?.invoiceNumber || payment.tradeOrder?.productName || payment.sampleOrder?.title || 'Payment record'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {payment.method} | {payment.currency} {Number(payment.amount).toLocaleString()} | {new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${payment.status === 'PAID' ? 'bg-green-50 text-green-700' : payment.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
