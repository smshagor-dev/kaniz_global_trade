'use client'

import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface FinancingRequest {
  id: string
  amount: number
  currencyCode: string
  facilityType: string
  status: string
  purpose: string
  company: { name: string }
  partnerName?: string | null
  partner?: { id: string; name: string; code: string } | null
}

interface PartnerCatalogResponse {
  partners: Array<{ id: string; name: string; code: string }>
}

export default function AdminFinancingRequestsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-financing-requests'],
    queryFn: () => get<FinancingRequest[]>('/admin/financing-requests'),
  })
  const { data: partnersData } = useQuery({
    queryKey: ['admin-financing-partners'],
    queryFn: () => get<PartnerCatalogResponse>('/partners?type=FINANCING'),
  })

  async function update(requestId: string, status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED', partnerId?: string) {
    await patch('/admin/financing-requests', { requestId, status, partnerId })
    toast.success(`Request ${status.toLowerCase()}`)
    refetch()
  }

  const requests = (data?.data || []) as FinancingRequest[]
  const partners = ((partnersData?.data as PartnerCatalogResponse | undefined)?.partners || [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financing Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Manage supplier working-capital requests and lender partnerships.</p>
      </div>
      {requests.map((request) => (
        <div key={request.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{request.company.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{request.currencyCode} {Number(request.amount).toLocaleString()} | {request.facilityType}</p>
              <p className="text-xs text-gray-400 mt-1">{request.partner?.name || request.partnerName || 'No partner assigned'}</p>
              <p className="text-xs text-gray-400 mt-1">{request.purpose}</p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <select
                defaultValue={request.partner?.id || ''}
                onChange={(event) => patch('/admin/financing-requests', { requestId: request.id, partnerId: event.target.value }).then(() => { toast.success('Partner assigned'); refetch() })}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Assign partner</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>{partner.name} ({partner.code})</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={() => update(request.id, 'UNDER_REVIEW', request.partner?.id)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Review</button>
                <button onClick={() => update(request.id, 'APPROVED', request.partner?.id)} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Approve</button>
                <button onClick={() => update(request.id, 'DISBURSED', request.partner?.id)} className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm">Disburse</button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
