'use client'

import { useEffect, useState } from 'react'
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
  partner?: { id: string; name: string; code: string } | null
}

interface PartnerCatalogResponse {
  defaultPartner?: { id: string; name: string; code: string } | null
  partners: Array<{ id: string; name: string; code: string }>
}

export default function SupplierFinancingPage() {
  const [form, setForm] = useState({ amount: 10000, currencyCode: 'USD', purpose: '', facilityType: 'WORKING_CAPITAL', termDays: 30, partnerId: '', partnerName: '' })
  const { data, refetch } = useQuery({
    queryKey: ['supplier-financing-requests'],
    queryFn: () => get<FinancingRequest[]>('/financing-requests'),
  })
  const { data: partnersData } = useQuery({
    queryKey: ['financing-partners'],
    queryFn: () => get<PartnerCatalogResponse>('/partners?type=FINANCING'),
  })

  async function submit() {
    await post('/financing-requests', form)
    toast.success('Financing request submitted')
    const defaultPartner = (partnersData?.data as PartnerCatalogResponse | undefined)?.defaultPartner
    setForm({ amount: 10000, currencyCode: 'USD', purpose: '', facilityType: 'WORKING_CAPITAL', termDays: 30, partnerId: defaultPartner?.id || '', partnerName: defaultPartner?.name || '' })
    refetch()
  }

  const requests = (data?.data || []) as FinancingRequest[]
  const partnerCatalog = (partnersData?.data as PartnerCatalogResponse | undefined)?.partners || []

  useEffect(() => {
    const defaultPartner = (partnersData?.data as PartnerCatalogResponse | undefined)?.defaultPartner
    if (defaultPartner && !form.partnerId) {
      setForm((current) => ({ ...current, partnerId: defaultPartner.id, partnerName: defaultPartner.name }))
    }
  }, [form.partnerId, partnersData?.data])

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
        <select value={form.partnerId} onChange={(e) => setForm((v) => ({ ...v, partnerId: e.target.value, partnerName: partnerCatalog.find((item) => item.id === e.target.value)?.name || '' }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2">
          <option value="">Select financing partner</option>
          {partnerCatalog.map((partner) => (
            <option key={partner.id} value={partner.id}>{partner.name} ({partner.code})</option>
          ))}
        </select>
        <textarea value={form.purpose} onChange={(e) => setForm((v) => ({ ...v, purpose: e.target.value }))} placeholder="Purpose and trade context" rows={4} className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2" />
        <button onClick={submit} className="md:col-span-2 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium">Request Financing</button>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{request.facilityType}</h2>
              <p className="text-sm text-gray-500">{request.currencyCode} {Number(request.amount).toLocaleString()} | {request.partner?.name || request.partnerName || 'No partner selected'}</p>
              <p className="text-xs text-gray-400 mt-1">{request.purpose}</p>
            </div>
            <p className="text-sm font-medium text-gray-900">{request.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
