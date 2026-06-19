'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Policy {
  id: string
  providerName: string
  policyType: string
}

interface Claim {
  id: string
  title: string
  claimAmount: number
  currencyCode: string
  status: string
  policy: { providerName: string; policyType: string }
}

export default function BuyerClaimsPage() {
  const [form, setForm] = useState({ policyId: '', title: '', description: '', claimAmount: 1000, currencyCode: 'USD' })
  const { data: policiesData } = useQuery({
    queryKey: ['buyer-claim-policies'],
    queryFn: () => get<Policy[]>('/insurance-policies'),
  })
  const { data: claimsData, refetch } = useQuery({
    queryKey: ['buyer-insurance-claims'],
    queryFn: () => get<Claim[]>('/insurance-claims'),
  })

  async function submit() {
    await post('/insurance-claims', form)
    toast.success('Claim submitted')
    setForm({ policyId: '', title: '', description: '', claimAmount: 1000, currencyCode: 'USD' })
    refetch()
  }

  const policies = (policiesData?.data || []) as Policy[]
  const claims = (claimsData?.data || []) as Claim[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insurance Claims</h1>
        <p className="text-sm text-gray-500 mt-1">Submit and track claims against active cargo or trade insurance policies.</p>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-5 grid md:grid-cols-2 gap-3">
        <select value={form.policyId} onChange={(e) => setForm((v) => ({ ...v, policyId: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Select policy</option>
          {policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.providerName} | {policy.policyType}</option>)}
        </select>
        <input value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} placeholder="Claim title" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" value={form.claimAmount} onChange={(e) => setForm((v) => ({ ...v, claimAmount: Number(e.target.value) }))} placeholder="Claim amount" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.currencyCode} onChange={(e) => setForm((v) => ({ ...v, currencyCode: e.target.value }))} placeholder="Currency" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <textarea value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} placeholder="Describe the loss or issue" rows={4} className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2" />
        <button onClick={submit} className="md:col-span-2 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium">Submit Claim</button>
      </div>
      <div className="space-y-3">
        {claims.map((claim) => (
          <div key={claim.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{claim.title}</h2>
              <p className="text-sm text-gray-500">{claim.policy.providerName} | {claim.currencyCode} {Number(claim.claimAmount).toLocaleString()}</p>
            </div>
            <p className="text-sm font-medium text-gray-900">{claim.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
