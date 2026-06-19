'use client'

import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Claim {
  id: string
  title: string
  claimAmount: number
  currencyCode: string
  status: string
  company: { name: string }
  policy: { providerName: string; policyType: string }
}

export default function AdminInsuranceClaimsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-insurance-claims'],
    queryFn: () => get<Claim[]>('/admin/insurance-claims'),
  })

  async function update(claimId: string, status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SETTLED') {
    await patch('/admin/insurance-claims', { claimId, status })
    toast.success(`Claim ${status.toLowerCase()}`)
    refetch()
  }

  const claims = (data?.data || []) as Claim[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insurance Claims</h1>
        <p className="text-sm text-gray-500 mt-1">Review, approve, reject, and settle insurance claims from buyers.</p>
      </div>
      {claims.map((claim) => (
        <div key={claim.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{claim.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{claim.company.name} | {claim.policy.providerName} | {claim.currencyCode} {Number(claim.claimAmount).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => update(claim.id, 'UNDER_REVIEW')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Review</button>
              <button onClick={() => update(claim.id, 'APPROVED')} className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm">Approve</button>
              <button onClick={() => update(claim.id, 'SETTLED')} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Settle</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
