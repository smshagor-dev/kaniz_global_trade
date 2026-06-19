'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Policy {
  id: string
  providerName: string
  policyType: string
  insuredAmount: number
  premiumAmount: number
  currencyCode: string
  status: string
}

export default function SupplierInsurancePage() {
  const [form, setForm] = useState({ providerName: 'Allianz Trade', policyType: 'CARGO_INSURANCE', insuredAmount: 10000, premiumAmount: 120, currencyCode: 'USD', coverageSummary: '', claimInstructions: '' })
  const { data, refetch } = useQuery({
    queryKey: ['supplier-insurance-policies'],
    queryFn: () => get<Policy[]>('/insurance-policies'),
  })

  async function submit() {
    await post('/insurance-policies', form)
    toast.success('Insurance quote created')
    setForm({ providerName: 'Allianz Trade', policyType: 'CARGO_INSURANCE', insuredAmount: 10000, premiumAmount: 120, currencyCode: 'USD', coverageSummary: '', claimInstructions: '' })
    refetch()
  }

  const policies = (data?.data || []) as Policy[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insurance Services</h1>
        <p className="text-sm text-gray-500 mt-1">Offer cargo and trade insurance coverage directly alongside your orders.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 grid md:grid-cols-2 gap-3">
        <input value={form.providerName} onChange={(e) => setForm((v) => ({ ...v, providerName: e.target.value }))} placeholder="Provider" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.policyType} onChange={(e) => setForm((v) => ({ ...v, policyType: e.target.value }))} placeholder="Policy type" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" value={form.insuredAmount} onChange={(e) => setForm((v) => ({ ...v, insuredAmount: Number(e.target.value) }))} placeholder="Insured amount" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" value={form.premiumAmount} onChange={(e) => setForm((v) => ({ ...v, premiumAmount: Number(e.target.value) }))} placeholder="Premium" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.currencyCode} onChange={(e) => setForm((v) => ({ ...v, currencyCode: e.target.value }))} placeholder="Currency" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.coverageSummary} onChange={(e) => setForm((v) => ({ ...v, coverageSummary: e.target.value }))} placeholder="Coverage summary" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <textarea value={form.claimInstructions} onChange={(e) => setForm((v) => ({ ...v, claimInstructions: e.target.value }))} placeholder="Claim instructions" rows={3} className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2" />
        <button onClick={submit} className="md:col-span-2 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium">Create Insurance Offer</button>
      </div>

      <div className="space-y-3">
        {policies.map((policy) => (
          <div key={policy.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{policy.providerName} | {policy.policyType}</h2>
              <p className="text-sm text-gray-500">{policy.currencyCode} {Number(policy.insuredAmount).toLocaleString()} insured | Premium {Number(policy.premiumAmount).toLocaleString()}</p>
            </div>
            <p className="text-sm font-medium text-gray-900">{policy.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
