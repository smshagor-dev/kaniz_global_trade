'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Claim {
  id: string
  title: string
  claimAmount: number
  currencyCode: string
  status: string
  statusLabel: string
  description: string
  resolutionNotes?: string | null
  company: { name: string }
  buyer: { firstName: string; lastName: string }
  policy: { providerName: string; policyType: string; status: string }
  evidenceUrlsList?: string[]
}

export default function AdminInsuranceClaimsPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin-insurance-claims'],
    queryFn: () => get<Claim[]>('/admin/insurance-claims'),
  })

  async function update(claimId: string, status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SETTLED') {
    setLoadingId(`${claimId}-${status}`)
    try {
      await patch('/admin/insurance-claims', { claimId, status })
      toast.success(`Claim moved to ${status.toLowerCase()}`)
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update claim'
      toast.error(message)
    } finally {
      setLoadingId(null)
    }
  }

  const claims = (data?.data || []) as Claim[]

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#1f2937]">Insurance claims</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
          Review the evidence trail, keep policy state aligned, and push claim decisions back to the buyer in real time.
        </p>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Claims queue</h2>
          <p className="mt-1 text-sm text-[#68726b]">{claims.length} insurance claims in review</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : !claims.length ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No insurance claims found.</div>
        ) : (
          <div className="divide-y divide-[#eef1eb]">
            {claims.map((claim) => (
              <div key={claim.id} className="px-6 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-[#1f2937]">{claim.title}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getClaimStatusTone(claim.status)}`}>
                        {claim.statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#49544e]">{claim.company.name} · Buyer {claim.buyer.firstName} {claim.buyer.lastName}</p>
                    <p className="mt-1 text-sm text-[#68726b]">{claim.policy.providerName} · {claim.policy.policyType.replaceAll('_', ' ')}</p>
                    <p className="mt-2 text-sm text-[#68726b]">{claim.description}</p>
                    {claim.resolutionNotes ? <p className="mt-2 text-sm text-[#68726b]">Resolution: {claim.resolutionNotes}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#738076]">
                      <span>{claim.currencyCode} {claim.claimAmount.toLocaleString()}</span>
                      <span>{claim.evidenceUrlsList?.length || 0} evidence files</span>
                      <span>Policy status: {claim.policy.status.replaceAll('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => update(claim.id, status)}
                        disabled={loadingId === `${claim.id}-${status}`}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                          status === 'APPROVED'
                            ? 'bg-[#265ea8] text-white'
                            : status === 'SETTLED'
                              ? 'bg-[#216c43] text-white'
                              : status === 'REJECTED'
                                ? 'bg-[#b64242] text-white'
                                : 'border border-[#d9ddd4] bg-white text-[#49544e]'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {loadingId === `${claim.id}-${status}` ? 'Updating...' : status.replaceAll('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function getClaimStatusTone(status: string) {
  switch (status) {
    case 'OPEN': return 'bg-[#fff4de] text-[#a66a00]'
    case 'UNDER_REVIEW': return 'bg-[#e7f1ff] text-[#265ea8]'
    case 'APPROVED': return 'bg-[#ede9fe] text-[#6b46c1]'
    case 'SETTLED': return 'bg-[#e7f6ec] text-[#216c43]'
    case 'REJECTED': return 'bg-[#fdecec] text-[#b64242]'
    default: return 'bg-[#eef1eb] text-[#5f6862]'
  }
}
