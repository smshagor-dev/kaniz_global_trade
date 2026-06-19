'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

interface Policy {
  id: string
  providerName: string
  policyType: string
  insuredAmount: number
  premiumAmount: number
  currencyCode: string
  status: string
}

export default function BuyerInsurancePage() {
  const { data } = useQuery({
    queryKey: ['buyer-insurance'],
    queryFn: () => get<Policy[]>('/insurance-policies'),
  })

  const policies = (data?.data || []) as Policy[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insurance Center</h1>
        <p className="text-sm text-gray-500 mt-1">Review cargo and trade insurance protection attached to your orders.</p>
      </div>
      {policies.map((policy) => (
        <div key={policy.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900">{policy.providerName} | {policy.policyType}</h2>
          <p className="text-sm text-gray-500 mt-1">{policy.currencyCode} {Number(policy.insuredAmount).toLocaleString()} insured</p>
          <p className="text-xs text-gray-400 mt-1">Premium {Number(policy.premiumAmount).toLocaleString()} | {policy.status}</p>
        </div>
      ))}
      {policies.length === 0 && <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">No insurance policies yet.</div>}
    </div>
  )
}
