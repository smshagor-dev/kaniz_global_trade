'use client'

import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Verification {
  id: string
  status: string
  companyName?: string
  user: { firstName: string; lastName: string; email: string }
}

export default function AdminBuyerVerificationsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-buyer-verifications'],
    queryFn: () => get<Verification[]>('/admin/buyer-verifications'),
  })

  async function review(verificationId: string, status: 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED') {
    await patch('/admin/buyer-verifications', { verificationId, status })
    toast.success(`Verification ${status.toLowerCase()}`)
    refetch()
  }

  const items = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buyer Verification Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Approve or reject buyers so suppliers can evaluate trustworthiness.</p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="font-bold text-gray-900">{item.companyName || `${item.user.firstName} ${item.user.lastName}`}</h2>
            <p className="text-sm text-gray-500 mt-1">{item.user.email} | {item.status}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => review(item.id, 'UNDER_REVIEW')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Under Review</button>
              <button onClick={() => review(item.id, 'VERIFIED')} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Verify</button>
              <button onClick={() => review(item.id, 'REJECTED')} className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
