'use client'

import { useQuery } from '@tanstack/react-query'
import { FileCheck2, Loader2, Shield, Wallet } from 'lucide-react'
import { get } from '@/lib/utils/api-client'

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
  claimCount: number
  latestClaimStatus?: string | null
  partner?: { id: string; name: string; code: string } | null
}

interface InsuranceResponse {
  items: Policy[]
}

export default function BuyerInsurancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['buyer-insurance'],
    queryFn: () => get<InsuranceResponse>('/insurance-policies'),
  })

  const response = data?.data as InsuranceResponse | undefined
  const policies = response?.items || []

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
          Buyer insurance
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Insurance center</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
          Review the coverage attached to your trade and sample orders and keep claim-readiness visible from one screen.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Policies', value: policies.length, icon: Shield },
          { label: 'Active', value: policies.filter((policy) => policy.status === 'ACTIVE').length, icon: FileCheck2 },
          { label: 'Open claims', value: policies.filter((policy) => policy.status === 'CLAIM_OPEN').length, icon: Wallet },
        ].map((item) => (
          <div key={item.label} className="rounded-[24px] border border-[#d9ddd4] bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f5ef] text-[#4f5d49]">
              <item.icon className="h-4 w-4" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-[#1f2937]">{item.value}</p>
            <p className="mt-1 text-sm text-[#68726b]">{item.label}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Coverage activity</h2>
          <p className="mt-1 text-sm text-[#68726b]">Coverage source, policy state, and claim visibility for every insured order</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : !policies.length ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No insurance policies yet.</div>
        ) : (
          <div className="divide-y divide-[#eef1eb]">
            {policies.map((policy) => (
              <article key={policy.id} className="px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#1f2937]">{policy.partner?.name || policy.providerName} · {policy.policyType.replaceAll('_', ' ')}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getPolicyStatusTone(policy.status)}`}>
                        {policy.statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#33403a]">{policy.sourceLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#738076]">
                      <span>{policy.sourceType.replaceAll('_', ' ')}</span>
                      <span>{policy.claimCount} claims</span>
                      {policy.latestClaimStatus ? <span>Latest claim: {policy.latestClaimStatus}</span> : null}
                    </div>
                  </div>

                  <div className="text-sm text-[#5f6862] lg:text-right">
                    <p className="font-semibold text-[#1f2937]">{policy.currencyCode} {policy.insuredAmount.toLocaleString()} insured</p>
                    <p className="mt-1">Premium {policy.currencyCode} {policy.premiumAmount.toLocaleString()}</p>
                  </div>
                </div>
              </article>
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
