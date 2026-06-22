'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Policy {
  id: string
  providerName: string
  policyType: string
  insuredAmount: number
  premiumAmount: number
  currencyCode: string
  status: string
  statusLabel: string
  sourceType: string
  sourceLabel: string
  company: { name: string }
  buyer?: { firstName: string; lastName: string } | null
  claimCount: number
  partner?: { id: string; name: string; code: string } | null
}

interface PartnerCatalogResponse {
  partners: Array<{ id: string; name: string; code: string }>
}

export default function AdminInsurancePoliciesPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin-insurance-policies'],
    queryFn: () => get<Policy[]>('/admin/insurance-policies'),
  })
  const { data: partnersData } = useQuery({
    queryKey: ['admin-insurance-partners'],
    queryFn: () => get<PartnerCatalogResponse>('/partners?type=INSURANCE'),
  })

  async function update(policyId: string, status: 'ACTIVE' | 'CLAIM_OPEN' | 'CLAIM_SETTLED' | 'EXPIRED' | 'CANCELLED', partnerId?: string) {
    setLoadingId(`${policyId}-${status}`)
    try {
      await patch('/admin/insurance-policies', { policyId, status, partnerId })
      toast.success(`Policy moved to ${status.toLowerCase()}`)
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update insurance policy'
      toast.error(message)
    } finally {
      setLoadingId(null)
    }
  }

  async function assignPartner(policyId: string, partnerId?: string) {
    try {
      await patch('/admin/insurance-policies', { policyId, partnerId })
      toast.success('Partner assigned')
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to assign partner'
      toast.error(message)
    }
  }

  const policies = (data?.data || []) as Policy[]
  const partners = ((partnersData?.data as PartnerCatalogResponse | undefined)?.partners || [])

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#1f2937]">Insurance policies</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
          Review supplier-issued policies, assign underwriters, and manage the coverage lifecycle for every protected order.
        </p>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Policy queue</h2>
          <p className="mt-1 text-sm text-[#68726b]">{policies.length} insurance policies in the system</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : !policies.length ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No insurance policies found.</div>
        ) : (
          <div className="divide-y divide-[#eef1eb]">
            {policies.map((policy) => (
              <div key={policy.id} className="px-6 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-[#1f2937]">{policy.partner?.name || policy.providerName} · {policy.policyType.replaceAll('_', ' ')}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getPolicyStatusTone(policy.status)}`}>
                        {policy.statusLabel}
                      </span>
                      <span className="rounded-full bg-[#eef2e7] px-2.5 py-1 text-xs font-semibold text-[#3e5840]">
                        {policy.sourceType.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#49544e]">{policy.sourceLabel}</p>
                    <p className="mt-1 text-sm text-[#68726b]">
                      {policy.company.name} · {policy.buyer ? `Buyer ${policy.buyer.firstName} ${policy.buyer.lastName}` : 'Buyer pending'}
                    </p>
                    <p className="mt-1 text-sm text-[#68726b]">
                      {policy.currencyCode} {policy.insuredAmount.toLocaleString()} insured · Premium {policy.currencyCode} {policy.premiumAmount.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-[#738076]">{policy.claimCount} claims</p>
                  </div>

                  <div className="flex flex-col gap-3 xl:items-end">
                    <select
                      defaultValue={policy.partner?.id || ''}
                      onChange={(event) => assignPartner(policy.id, event.target.value || undefined)}
                      className="rounded-xl border border-[#d9ddd4] bg-white px-3 py-2 text-sm text-[#49544e]"
                    >
                      <option value="">Assign partner</option>
                      {partners.map((partner) => (
                        <option key={partner.id} value={partner.id}>{partner.name} ({partner.code})</option>
                      ))}
                    </select>

                    <div className="flex flex-wrap gap-2">
                      {(['ACTIVE', 'CLAIM_OPEN', 'CLAIM_SETTLED', 'EXPIRED', 'CANCELLED'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => update(policy.id, status, policy.partner?.id)}
                          disabled={loadingId === `${policy.id}-${status}`}
                          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                            status === 'ACTIVE'
                              ? 'bg-[#216c43] text-white'
                              : status === 'CLAIM_OPEN'
                                ? 'bg-[#be123c] text-white'
                                : status === 'CLAIM_SETTLED'
                                  ? 'bg-[#265ea8] text-white'
                                  : 'border border-[#d9ddd4] bg-white text-[#49544e]'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {loadingId === `${policy.id}-${status}` ? 'Updating...' : status.replaceAll('_', ' ')}
                        </button>
                      ))}
                    </div>
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

function getPolicyStatusTone(status: string) {
  switch (status) {
    case 'QUOTED': return 'bg-[#fff4de] text-[#a66a00]'
    case 'ACTIVE': return 'bg-[#e7f6ec] text-[#216c43]'
    case 'CLAIM_OPEN': return 'bg-[#fff1f2] text-[#be123c]'
    case 'CLAIM_SETTLED': return 'bg-[#e7f1ff] text-[#265ea8]'
    case 'EXPIRED': return 'bg-[#eef1eb] text-[#5f6862]'
    case 'CANCELLED': return 'bg-[#fdecec] text-[#b64242]'
    default: return 'bg-[#eef1eb] text-[#5f6862]'
  }
}
