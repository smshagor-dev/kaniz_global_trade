'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Campaign {
  id: string
  title: string
  placement: string
  budget: number
  bidAmount: number
  status: string
}

export default function SupplierAdsPage() {
  const [form, setForm] = useState({
    title: '',
    placement: 'SEARCH_TOP',
    budget: 500,
    bidAmount: 25,
    targetKeyword: '',
    startsAt: '',
    endsAt: '',
  })

  const { data, refetch } = useQuery({
    queryKey: ['supplier-ad-campaigns'],
    queryFn: () => get<Campaign[]>('/ad-campaigns'),
  })

  async function submit() {
    await post('/ad-campaigns', form)
    toast.success('Campaign submitted')
    setForm({ title: '', placement: 'SEARCH_TOP', budget: 500, bidAmount: 25, targetKeyword: '', startsAt: '', endsAt: '' })
    refetch()
  }

  const campaigns = (data?.data || []) as Campaign[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Advertising</h1>
        <p className="text-sm text-gray-500 mt-1">Promote products in search and homepage placements to drive more leads.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 grid md:grid-cols-2 gap-3">
        <input value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} placeholder="Campaign title" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <select value={form.placement} onChange={(e) => setForm((v) => ({ ...v, placement: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="SEARCH_TOP">Search Top</option>
          <option value="HOMEPAGE_HERO">Homepage Hero</option>
          <option value="HOMEPAGE_FEATURED">Homepage Featured</option>
          <option value="CATEGORY_SPOTLIGHT">Category Spotlight</option>
        </select>
        <input type="number" value={form.budget} onChange={(e) => setForm((v) => ({ ...v, budget: Number(e.target.value) }))} placeholder="Budget" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" value={form.bidAmount} onChange={(e) => setForm((v) => ({ ...v, bidAmount: Number(e.target.value) }))} placeholder="Bid amount" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.targetKeyword} onChange={(e) => setForm((v) => ({ ...v, targetKeyword: e.target.value }))} placeholder="Target keyword" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={form.startsAt} onChange={(e) => setForm((v) => ({ ...v, startsAt: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={form.endsAt} onChange={(e) => setForm((v) => ({ ...v, endsAt: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={submit} className="md:col-span-2 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium">Submit Campaign</button>
      </div>

      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{campaign.title}</h2>
              <p className="text-sm text-gray-500">{campaign.placement} | Budget ${Number(campaign.budget).toLocaleString()} | Bid ${Number(campaign.bidAmount).toLocaleString()}</p>
            </div>
            <p className="text-sm font-medium text-gray-900">{campaign.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
