'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface FinancingRequest {
  id: string
  amount: number
  currencyCode: string
  facilityType: string
  status: string
  statusLabel: string
  purpose: string
  riskScore: number
  recommendedLimit?: number | null
  reviewNotes?: string | null
  company: { name: string }
  requester?: { firstName: string; lastName: string } | null
  partnerName?: string | null
  partner?: { id: string; name: string; code: string } | null
}

interface PartnerCatalogResponse {
  partners: Array<{ id: string; name: string; code: string }>
}

export default function AdminFinancingRequestsPage() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const { data, refetch } = useQuery({
    queryKey: ['admin-financing-requests'],
    queryFn: () => get<FinancingRequest[]>('/admin/financing-requests'),
  })
  const { data: partnersData } = useQuery({
    queryKey: ['admin-financing-partners'],
    queryFn: () => get<PartnerCatalogResponse>('/partners?type=FINANCING'),
  })

  async function update(requestId: string, payload: { status?: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'CLOSED'; partnerId?: string }) {
    setLoadingKey(`${requestId}-${payload.status || payload.partnerId || 'partner'}`)
    try {
      await patch('/admin/financing-requests', { requestId, ...payload })
      toast.success('Financing request updated')
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update financing request'
      toast.error(message)
    } finally {
      setLoadingKey(null)
    }
  }

  const requests = (data?.data || []) as FinancingRequest[]
  const partners = ((partnersData?.data as PartnerCatalogResponse | undefined)?.partners || [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financing Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Manage supplier working-capital requests, assign financing partners, and control lifecycle transitions safely.</p>
      </div>
      {requests.map((request) => (
        <div key={request.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-gray-900">{request.company.name}</h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{request.statusLabel}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {request.currencyCode} {Number(request.amount).toLocaleString()} | {request.facilityType.replaceAll('_', ' ')}
                {request.requester ? ` | ${request.requester.firstName} ${request.requester.lastName}` : ''}
              </p>
              <p className="text-xs text-gray-400 mt-1">{request.partner?.name || request.partnerName || 'No partner assigned'}</p>
              <p className="text-xs text-gray-400 mt-1">{request.purpose}</p>
              <p className="text-xs text-gray-500 mt-2">
                Risk score {request.riskScore}{request.recommendedLimit != null ? ` | Recommended limit ${request.currencyCode} ${Number(request.recommendedLimit).toLocaleString()}` : ''}
              </p>
              {request.reviewNotes ? <p className="text-xs text-gray-500 mt-1">Review notes: {request.reviewNotes}</p> : null}
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <select
                defaultValue={request.partner?.id || ''}
                onChange={(event) => update(request.id, { partnerId: event.target.value || undefined })}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Assign partner</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>{partner.name} ({partner.code})</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                {(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => update(request.id, { status, partnerId: request.partner?.id })}
                    disabled={loadingKey === `${request.id}-${status}`}
                    className={`px-3 py-2 rounded-lg text-sm ${status === 'APPROVED' ? 'bg-green-700 text-white' : status === 'DISBURSED' ? 'bg-blue-700 text-white' : status === 'REJECTED' ? 'bg-red-700 text-white' : 'border border-gray-200 text-sm'} disabled:opacity-60`}
                  >
                    {loadingKey === `${request.id}-${status}` ? 'Updating...' : status.replaceAll('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
