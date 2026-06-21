import type { Prisma } from '@prisma/client'

export const PUBLIC_RFQ_ACTIVE_STATUSES = ['OPEN', 'RECEIVING_QUOTATIONS'] as const

export function buildPublicActiveRFQWhere(now = new Date()): Prisma.RFQWhereInput {
  return {
    deletedAt: null,
    isPublic: true,
    status: { in: [...PUBLIC_RFQ_ACTIVE_STATUSES] },
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: now } },
    ],
  }
}

export function isPubliclyVisibleRFQStatus(status: string): boolean {
  return PUBLIC_RFQ_ACTIVE_STATUSES.includes(status as (typeof PUBLIC_RFQ_ACTIVE_STATUSES)[number])
}
