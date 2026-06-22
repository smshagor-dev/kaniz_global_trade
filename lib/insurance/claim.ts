import { humanizeInsuranceStatus } from '@/lib/insurance/policy'

export function humanizeClaimStatus(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function parseEvidenceUrls(raw: string | null) {
  if (!raw) return [] as string[]
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function formatInsuranceClaim<
  T extends {
    claimAmount: unknown
    policy?: { providerName: string; policyType: string; status: string } | null
    company?: { id: string; name: string; slug: string } | null
    buyer?: { id: string; firstName: string; lastName: string } | null
    evidenceUrls?: string | null
  } & Record<string, unknown>,
>(claim: T) {
  return {
    ...claim,
    claimAmount: Number(claim.claimAmount || 0),
    statusLabel: humanizeClaimStatus(String(claim.status || '')),
    evidenceUrlsList: parseEvidenceUrls(claim.evidenceUrls || null),
    companyName: claim.company?.name || null,
    buyerName: claim.buyer ? `${claim.buyer.firstName} ${claim.buyer.lastName}`.trim() : null,
    policyStatusLabel: claim.policy?.status ? humanizeInsuranceStatus(claim.policy.status) : null,
  }
}
