import prisma from '@/lib/db/prisma'

export async function openInsuranceClaim(policyId: string) {
  return prisma.insurancePolicy.update({
    where: { id: policyId },
    data: { status: 'CLAIM_OPEN' },
  })
}

export async function settleInsuranceClaim(policyId: string) {
  return prisma.insurancePolicy.update({
    where: { id: policyId },
    data: { status: 'CLAIM_SETTLED' },
  })
}
