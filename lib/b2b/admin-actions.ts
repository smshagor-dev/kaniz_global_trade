import prisma from '@/lib/db/prisma'
import { ApiError } from '@/lib/permissions'

export async function updateBuyerVerification(companyId: string, adminUserId: string, status: 'APPROVED' | 'REJECTED', note?: string) {
  const company = await prisma.b2BCompany.findUnique({
    where: { id: companyId },
    select: { id: true },
  })

  if (!company) {
    throw new ApiError(404, 'B2B company not found')
  }

  return prisma.b2BCompany.update({
    where: { id: companyId },
    data: {
      buyerVerificationStatus: status,
      buyerVerificationNote: note || null,
      buyerVerifiedAt: status === 'APPROVED' ? new Date() : null,
      buyerVerifiedBy: adminUserId,
    },
  })
}

export async function updateSupplierVerification(companyId: string, adminUserId: string, status: 'APPROVED' | 'REJECTED', note?: string) {
  const company = await prisma.b2BCompany.findUnique({
    where: { id: companyId },
    select: { id: true },
  })

  if (!company) {
    throw new ApiError(404, 'B2B company not found')
  }

  return prisma.b2BCompany.update({
    where: { id: companyId },
    data: {
      supplierVerificationStatus: status,
      supplierVerificationNote: note || null,
      supplierVerifiedAt: status === 'APPROVED' ? new Date() : null,
      supplierVerifiedBy: adminUserId,
    },
  })
}
