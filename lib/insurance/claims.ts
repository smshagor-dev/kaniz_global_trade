import type { Prisma } from '@prisma/client'
import prisma from '@/lib/db/prisma'

function getClient(tx?: Prisma.TransactionClient) {
  return tx ?? prisma
}

export async function openInsuranceClaim(policyId: string, tx?: Prisma.TransactionClient) {
  return getClient(tx).insurancePolicy.update({
    where: { id: policyId },
    data: { status: 'CLAIM_OPEN' },
  })
}

export async function settleInsuranceClaim(policyId: string, tx?: Prisma.TransactionClient) {
  return getClient(tx).insurancePolicy.update({
    where: { id: policyId },
    data: { status: 'CLAIM_SETTLED' },
  })
}

export async function reactivateInsurancePolicy(policyId: string, tx?: Prisma.TransactionClient) {
  return getClient(tx).insurancePolicy.update({
    where: { id: policyId },
    data: { status: 'ACTIVE' },
  })
}

export async function syncInsurancePolicyClaimState(policyId: string, tx?: Prisma.TransactionClient) {
  const client = getClient(tx)
  const [policy, claims] = await Promise.all([
    client.insurancePolicy.findUnique({
      where: { id: policyId },
      select: { status: true },
    }),
    client.insuranceClaim.findMany({
    where: { policyId },
    select: { status: true },
    }),
  ])

  if (claims.some((claim) => ['OPEN', 'UNDER_REVIEW', 'APPROVED'].includes(claim.status))) {
    return openInsuranceClaim(policyId, tx)
  }

  if (claims.some((claim) => claim.status === 'SETTLED')) {
    return settleInsuranceClaim(policyId, tx)
  }

  if (policy?.status === 'EXPIRED' || policy?.status === 'CANCELLED') {
    return policy
  }

  return reactivateInsurancePolicy(policyId, tx)
}
