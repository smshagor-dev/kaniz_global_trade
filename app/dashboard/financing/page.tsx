'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface FinancingRequest {
  id: string
  amount: number
  currencyCode: string
  facilityType: string
  status: string
  partnerName?: string | null
  purpose: string
}

export default function SupplierFinancingPage() {
  const [form, setForm] = useState({ amount: 10000, currencyCode: 'USD', purpose: '', facilityType: 'WORKING_CAPITAL', termDays: 30, partnerName: '' })
  const { data, refetch } = useQuery({
    queryKey: ['supplier-financing-requests'],
    queryFn: () => get<FinancingRequest[]>('/financing-requests'),
  })

  async function submit() {
    await post('/financing-requests', form)
    toast.success('Financing request submitted')
    setForm({ amount: 10000, currencyCode: 'USD', purpose: '', facilityType: 'WORKING_CAPITAL', termDays: 30, partnerName: '' })
    refetch()
  }

  const requests = (data?.data || []) as FinancingRequest[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financing</h1>
        <p className="text-sm text-gray-500 mt-1">Request working capital support for larger buyer orders and raw material sourcing.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 grid md:grid-cols-2 gap-3">
        <input type="number" value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: Number(e.target.value) }))} placeholder="Amount" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.currencyCode} onChange={(e) => setForm((v) => ({ ...v, currencyCode: e.target.value }))} placeholder="Currency" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.facilityType} onChange={(e) => setForm((v) => ({ ...v, facilityType: e.target.value }))} placeholder="Facility type" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" value={form.termDays} onChange={(e) => setForm((v) => ({ ...v, termDays: Number(e.target.value) }))} placeholder="Term days" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.partnerName} onChange={(e) => setForm((v) => ({ ...v, partnerName: e.target.value }))} placeholder="Preferred partner" className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2" />
        <textarea value={form.purpose} onChange={(e) => setForm((v) => ({ ...v, purpose: e.target.value }))} placeholder="Purpose and trade context" rows={4} className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2" />
        <button onClick={submit} className="md:col-span-2 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium">Request Financing</button>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{request.facilityType}</h2>
              <p className="text-sm text-gray-500">{request.currencyCode} {Number(request.amount).toLocaleString()} | {request.purpose}</p>
            </div>
            <p className="text-sm font-medium text-gray-900">{request.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
