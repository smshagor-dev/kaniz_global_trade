'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { useSearchParams } from 'next/navigation'

interface Campaign {
  id: string
  title: string
  placement: string
  budget: number
  bidAmount: number
  status: string
  product?: { id: string; name: string } | null
}

interface AdvertisingSettingsResponse {
  enabled: boolean
  autoApprove: boolean
  requireProductLink: boolean
  defaultBudget: number
  defaultBid: number
  minBudget: number
  maxBudget: number
  minBid: number
  maxBid: number
  defaultDurationDays: number
  allowedPlacements: string[]
}

export default function SupplierAdsPage() {
  const params = useSearchParams()
  const [form, setForm] = useState({
    productId: '',
    title: '',
    placement: 'SEARCH_TOP',
    budget: 0,
    bidAmount: 0,
    targetKeyword: '',
    creativeUrl: '',
    startsAt: '',
    endsAt: '',
  })

  const { data: settingsData } = useQuery({
    queryKey: ['advertising-settings'],
    queryFn: () => get<AdvertisingSettingsResponse>('/ad-campaigns/settings'),
  })

  const advertisingSettings = settingsData?.data as AdvertisingSettingsResponse | undefined

  useEffect(() => {
    const productId = params.get('productId') || ''
    const title = params.get('title') || ''
    const creativeUrl = params.get('creativeUrl') || ''
    if (!productId && !title && !creativeUrl) return

    setForm((current) => ({
      ...current,
      productId: productId || current.productId,
      title: title || current.title,
      creativeUrl: creativeUrl || current.creativeUrl,
    }))
  }, [params])

  useEffect(() => {
    if (!advertisingSettings) return

    const today = new Date()
    const end = new Date(today)
    end.setDate(end.getDate() + Math.max(1, advertisingSettings.defaultDurationDays))

    setForm((current) => ({
      ...current,
      placement: advertisingSettings.allowedPlacements.includes(current.placement)
        ? current.placement
        : advertisingSettings.allowedPlacements[0] || current.placement,
      budget: current.budget > 0 ? current.budget : advertisingSettings.defaultBudget,
      bidAmount: current.bidAmount > 0 ? current.bidAmount : advertisingSettings.defaultBid,
      startsAt: current.startsAt || today.toISOString().slice(0, 10),
      endsAt: current.endsAt || end.toISOString().slice(0, 10),
    }))
  }, [advertisingSettings])

  const { data, refetch } = useQuery({
    queryKey: ['supplier-ad-campaigns'],
    queryFn: () => get<Campaign[]>('/ad-campaigns'),
  })

  async function submit() {
    await post('/ad-campaigns', form)
    toast.success('Campaign submitted')
    setForm({ productId: '', title: '', placement: 'SEARCH_TOP', budget: 500, bidAmount: 25, targetKeyword: '', creativeUrl: '', startsAt: '', endsAt: '' })
    refetch()
  }

  const campaigns = (data?.data || []) as Campaign[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Advertising</h1>
        <p className="text-sm text-gray-500 mt-1">Promote products in search and homepage placements to drive more leads.</p>
      </div>

      {advertisingSettings ? (
        <div className={`rounded-xl border p-4 text-sm ${advertisingSettings.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
          <p className="font-semibold">{advertisingSettings.enabled ? 'Advertising is enabled' : 'Advertising is disabled by admin'}</p>
          <p className="mt-1 text-xs opacity-80">
            Allowed placements: {advertisingSettings.allowedPlacements.join(', ') || 'None'} | Budget {advertisingSettings.minBudget}-{advertisingSettings.maxBudget} | Bid {advertisingSettings.minBid}-{advertisingSettings.maxBid}
          </p>
        </div>
      ) : null}

      <div className="bg-white border border-gray-100 rounded-xl p-5 grid md:grid-cols-2 gap-3">
        <input value={form.productId} onChange={(e) => setForm((v) => ({ ...v, productId: e.target.value }))} placeholder="Linked product ID (optional)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} placeholder="Campaign title" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <select value={form.placement} onChange={(e) => setForm((v) => ({ ...v, placement: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          {(advertisingSettings?.allowedPlacements || ['SEARCH_TOP', 'HOMEPAGE_HERO', 'HOMEPAGE_FEATURED', 'CATEGORY_SPOTLIGHT']).map((placement) => (
            <option key={placement} value={placement}>
              {placement}
            </option>
          ))}
        </select>
        <input type="number" value={form.budget} onChange={(e) => setForm((v) => ({ ...v, budget: Number(e.target.value) }))} placeholder="Budget" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" value={form.bidAmount} onChange={(e) => setForm((v) => ({ ...v, bidAmount: Number(e.target.value) }))} placeholder="Bid amount" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.targetKeyword} onChange={(e) => setForm((v) => ({ ...v, targetKeyword: e.target.value }))} placeholder="Target keyword" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.creativeUrl} onChange={(e) => setForm((v) => ({ ...v, creativeUrl: e.target.value }))} placeholder="Creative image URL" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={form.startsAt} onChange={(e) => setForm((v) => ({ ...v, startsAt: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={form.endsAt} onChange={(e) => setForm((v) => ({ ...v, endsAt: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={submit} disabled={advertisingSettings?.enabled === false} className="md:col-span-2 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60">Submit Campaign</button>
      </div>

      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{campaign.title}</h2>
              <p className="text-sm text-gray-500">{campaign.placement} | Budget ${Number(campaign.budget).toLocaleString()} | Bid ${Number(campaign.bidAmount).toLocaleString()}</p>
              {campaign.product ? <p className="text-xs text-gray-400 mt-1">Linked product: {campaign.product.name}</p> : null}
            </div>
            <p className="text-sm font-medium text-gray-900">{campaign.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
