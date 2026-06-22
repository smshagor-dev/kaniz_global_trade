'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Campaign {
  id: string
  title: string
  placement: string
  status: string
  budget: number
  bidAmount?: number
  paymentStatus?: string | null
  paymentMethod?: string | null
  paymentFailureReason?: string | null
  company: { name: string }
}

interface AdvertisingSettingsSnapshot {
  enabled: boolean
  autoApprove: boolean
  requireProductLink: boolean
  allowedPlacements: string[]
  minBudget: number
  maxBudget: number
  minBid: number
  maxBid: number
}

export default function AdminAdCampaignsPage() {
  const { data: settingsData } = useQuery({
    queryKey: ['admin-advertising-settings-snapshot'],
    queryFn: () => get<AdvertisingSettingsSnapshot>('/ad-campaigns/settings'),
  })
  const { data, refetch } = useQuery({
    queryKey: ['admin-ad-campaigns'],
    queryFn: () => get<Campaign[]>('/admin/ad-campaigns'),
  })

  async function update(campaignId: string, status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'REJECTED') {
    await patch('/admin/ad-campaigns', { campaignId, status })
    toast.success(`Campaign ${status.toLowerCase()}`)
    refetch()
  }

  const campaigns = (data?.data || []) as Campaign[]
  const advertisingSettings = settingsData?.data as AdvertisingSettingsSnapshot | undefined

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advertising Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Approve paid placement campaigns for search and homepage inventory.</p>
        </div>
        <Link href="/admin/settings/advertising" className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white">
          Open Advertising Settings
        </Link>
      </div>
      {advertisingSettings ? (
        <div className={`rounded-xl border p-4 text-sm ${advertisingSettings.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
          <p className="font-semibold">{advertisingSettings.enabled ? 'Advertising is enabled' : 'Advertising is disabled'}</p>
          <p className="mt-1 text-xs opacity-80">
            Auto-approve: {advertisingSettings.autoApprove ? 'Yes' : 'No'} | Require linked product: {advertisingSettings.requireProductLink ? 'Yes' : 'No'} | Placements: {advertisingSettings.allowedPlacements.join(', ') || 'None'}
          </p>
          <p className="mt-1 text-xs opacity-80">
            Budget range: {advertisingSettings.minBudget} - {advertisingSettings.maxBudget} | Bid range: {advertisingSettings.minBid} - {advertisingSettings.maxBid}
          </p>
        </div>
      ) : null}
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{campaign.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {campaign.company.name} | {campaign.placement} | Budget ${Number(campaign.budget).toLocaleString()}
                {campaign.bidAmount != null ? ` | Bid $${Number(campaign.bidAmount).toLocaleString()}` : ''}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Payment {campaign.paymentStatus || 'N/A'}{campaign.paymentMethod ? ` via ${campaign.paymentMethod}` : ''}
              </p>
              {campaign.paymentFailureReason ? <p className="text-xs text-red-600 mt-2">{campaign.paymentFailureReason}</p> : null}
            </div>
            <div className="flex gap-2">
              <button onClick={() => update(campaign.id, 'ACTIVE')} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Approve</button>
              <button onClick={() => update(campaign.id, 'PAUSED')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Pause</button>
              <button onClick={() => update(campaign.id, 'REJECTED')} className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm">Reject</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
