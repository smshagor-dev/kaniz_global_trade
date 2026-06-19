'use client'

import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Campaign {
  id: string
  title: string
  placement: string
  status: string
  budget: number
  company: { name: string }
}

export default function AdminAdCampaignsPage() {
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Advertising Campaigns</h1>
        <p className="text-sm text-gray-500 mt-1">Approve paid placement campaigns for search and homepage inventory.</p>
      </div>
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{campaign.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{campaign.company.name} | {campaign.placement} | Budget ${Number(campaign.budget).toLocaleString()}</p>
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
