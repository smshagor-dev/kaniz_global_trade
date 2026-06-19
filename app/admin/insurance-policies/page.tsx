'use client'

import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Policy {
  id: string
  providerName: string
  policyType: string
  insuredAmount: number
  premiumAmount: number
  currencyCode: string
  status: string
  company: { name: string }
}

export default function AdminInsurancePoliciesPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-insurance-policies'],
    queryFn: () => get<Policy[]>('/admin/insurance-policies'),
  })

  async function update(policyId: string, status: 'ACTIVE' | 'CLAIM_OPEN' | 'CLAIM_SETTLED' | 'EXPIRED' | 'CANCELLED') {
    await patch('/admin/insurance-policies', { policyId, status })
    toast.success(`Policy ${status.toLowerCase()}`)
    refetch()
  }

  const policies = (data?.data || []) as Policy[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insurance Policies</h1>
        <p className="text-sm text-gray-500 mt-1">Activate cargo and trade insurance coverage for protected transactions.</p>
      </div>
      {policies.map((policy) => (
        <div key={policy.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{policy.providerName} | {policy.policyType}</h2>
              <p className="text-sm text-gray-500 mt-1">{policy.company.name} | {policy.currencyCode} {Number(policy.insuredAmount).toLocaleString()} insured</p>
              <p className="text-xs text-gray-400 mt-1">Premium {Number(policy.premiumAmount).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => update(policy.id, 'ACTIVE')} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Activate</button>
              <button onClick={() => update(policy.id, 'CLAIM_OPEN')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Open Claim</button>
              <button onClick={() => update(policy.id, 'CLAIM_SETTLED')} className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm">Settle</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
