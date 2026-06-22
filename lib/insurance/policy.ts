export function humanizeInsuranceStatus(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatInsurancePolicy<
  T extends {
    insuredAmount: unknown
    premiumAmount: unknown
    product?: { id: string; name: string; slug?: string } | null
    company?: { id: string; name: string; slug: string } | null
    buyer?: { id: string; firstName: string; lastName: string } | null
    partner?: { id: string; code: string; name: string; type?: string; isDefault?: boolean } | null
    tradeOrder?: { id: string; productName: string } | null
    sampleOrder?: { id: string; title: string } | null
    claims?: Array<{ id: string; status: string; createdAt?: string | Date }>
  } & Record<string, unknown>,
>(policy: T) {
  const sourceType = policy.product ? 'PRODUCT' : policy.tradeOrder ? 'TRADE_ORDER' : policy.sampleOrder ? 'SAMPLE_ORDER' : 'MANUAL'
  const sourceLabel =
    policy.product?.name ||
    policy.tradeOrder?.productName ||
    policy.sampleOrder?.title ||
    'Standalone insurance policy'

  return {
    ...policy,
    insuredAmount: Number(policy.insuredAmount || 0),
    premiumAmount: Number(policy.premiumAmount || 0),
    statusLabel: humanizeInsuranceStatus(String(policy.status || '')),
    sourceType,
    sourceLabel,
    companyName: policy.company?.name || null,
    buyerName: policy.buyer ? `${policy.buyer.firstName} ${policy.buyer.lastName}`.trim() : null,
    claimCount: policy.claims?.length || 0,
    latestClaimStatus: policy.claims?.[0]?.status ? humanizeInsuranceStatus(policy.claims[0].status) : null,
  }
}
