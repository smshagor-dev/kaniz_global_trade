'use client'

import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import { CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

interface ManualPaymentRequest {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string
  transferRef?: string | null
  reviewNotes?: string | null
  company?: { name: string } | null
  plan?: { name: string } | null
}

export default function AdminPaymentsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-manual-payments'],
    queryFn: () => get<ManualPaymentRequest[]>('/admin/manual-payments'),
  })

  async function review(requestId: string, status: 'PAID' | 'FAILED' | 'CANCELLED') {
    await patch('/admin/manual-payments', { requestId, status })
    toast.success(`Manual payment marked ${status.toLowerCase()}`)
    refetch()
  }

  const items = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manual Payments</h1>
        <p className="text-sm text-gray-500 mt-1">Review offline transfer requests and activate subscriptions after verification.</p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-gray-900">{item.company?.name || 'Company'}</h2>
                <p className="text-sm text-gray-500 mt-1">{item.plan?.name || 'Plan'} | {item.currency} {Number(item.amount).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Submitted {new Date(item.createdAt).toLocaleDateString()}</p>
                {item.transferRef && <p className="text-xs text-gray-400 mt-1">Reference: {item.transferRef}</p>}
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 text-gray-700 text-xs font-semibold">
                <CreditCard className="w-3.5 h-3.5" /> {item.status}
              </div>
            </div>
            {item.status === 'PENDING' && (
              <div className="flex gap-2 mt-4">
                <button onClick={() => review(item.id, 'PAID')} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Approve</button>
                <button onClick={() => review(item.id, 'FAILED')} className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm">Reject</button>
                <button onClick={() => review(item.id, 'CANCELLED')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Cancel</button>
              </div>
            )}
            {item.reviewNotes && <p className="text-sm text-gray-500 mt-3">{item.reviewNotes}</p>}
          </div>
        ))}
        {!items.length && <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-500">No manual payment requests found.</div>}
      </div>
    </div>
  )
}
