export function humanizeFinancingStatus(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatFinancingRequest<
  T extends {
    amount: unknown
    recommendedLimit?: unknown
    company?: { id: string; name: string; slug: string } | null
    requester?: { id: string; firstName: string; lastName: string; email?: string } | null
    partner?: { id: string; name: string; code: string } | null
  } & Record<string, unknown>,
>(request: T) {
  return {
    ...request,
    amount: Number(request.amount || 0),
    recommendedLimit: request.recommendedLimit == null ? null : Number(request.recommendedLimit),
    statusLabel: humanizeFinancingStatus(String(request.status || '')),
    companyName: request.company?.name || null,
    requesterName: request.requester ? `${request.requester.firstName} ${request.requester.lastName}`.trim() : null,
    partnerCode: request.partner?.code || null,
  }
}
