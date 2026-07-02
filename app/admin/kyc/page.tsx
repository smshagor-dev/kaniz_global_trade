'use client'

import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface KycRecord {
  id: string
  status: string
  riskLevel?: string
  user: { firstName: string; lastName: string; email: string }
  company?: { name: string }
}

export default function AdminKycPage() {
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId') || ''
  const queryString = userId ? `?userId=${userId}` : ''

  const { data, refetch } = useQuery({
    queryKey: ['admin-kyc', userId],
    queryFn: () => get<KycRecord[]>(`/admin/kyc${queryString}`),
  })

  async function review(kycId: string, status: 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED') {
    await patch('/admin/kyc', { kycId, status })
    toast.success(`KYC marked ${status.toLowerCase()}`)
    refetch()
  }

  const records = (data?.data || []) as KycRecord[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KYC Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">Verify large-trade compliance documents before higher-value transactions are approved.</p>
        {userId ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Filtered to one registered user</p> : null}
      </div>
      {records.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">
          {userId ? 'No data found for this user KYC review.' : 'No data found.'}
        </div>
      ) : (
        records.map((record) => (
          <div key={record.id} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">{record.user.firstName} {record.user.lastName}</h2>
                <p className="text-sm text-gray-500">{record.user.email} {record.company ? `| ${record.company.name}` : ''}</p>
                <p className="text-xs text-gray-400 mt-1">Status: {record.status} | Risk: {record.riskLevel || 'MEDIUM'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => review(record.id, 'UNDER_REVIEW')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Review</button>
                <button onClick={() => review(record.id, 'VERIFIED')} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Verify</button>
                <button onClick={() => review(record.id, 'REJECTED')} className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm">Reject</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
