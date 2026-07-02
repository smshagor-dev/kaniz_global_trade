import prisma from '@/lib/db/prisma'
import { b2bCompanyTypes, verificationStatuses } from '@/lib/b2b/company-schema'

type B2BCompanyType = typeof b2bCompanyTypes[number]
type B2BVerificationStatus = typeof verificationStatuses[number]

const supplierEligibleTypes: B2BCompanyType[] = [
  'SUPPLIER',
  'MANUFACTURER',
  'DISTRIBUTOR',
  'WHOLESALER',
]

export function isSupplierEligibleCompanyType(companyType: B2BCompanyType) {
  return supplierEligibleTypes.includes(companyType)
}

export async function getCompanyByUser(userId: string) {
  return prisma.b2BCompany.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      buyerVerifiedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      supplierVerifiedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })
}

export async function isApprovedBuyer(userId: string) {
  const company = await prisma.b2BCompany.findUnique({
    where: { userId },
    select: { buyerVerificationStatus: true },
  })

  return company?.buyerVerificationStatus === 'APPROVED'
}

export async function isApprovedSupplier(userId: string) {
  const company = await prisma.b2BCompany.findUnique({
    where: { userId },
    select: {
      companyType: true,
      supplierVerificationStatus: true,
    },
  })

  return !!company &&
    company.supplierVerificationStatus === 'APPROVED' &&
    isSupplierEligibleCompanyType(company.companyType)
}

export async function canCreateWholesaleProduct(userId: string) {
  return isApprovedSupplier(userId)
}

export async function canAccessBuyerFeatures(userId: string) {
  return isApprovedBuyer(userId)
}

export async function canAccessSupplierFeatures(userId: string) {
  return isApprovedSupplier(userId)
}

export function buildB2BStatusSummary(
  company: null | {
    companyType: B2BCompanyType
    buyerVerificationStatus: B2BVerificationStatus
    supplierVerificationStatus: B2BVerificationStatus
  }
) {
  const supplierEligible = company ? isSupplierEligibleCompanyType(company.companyType) : false

  return {
    hasCompany: !!company,
    supplierEligible,
    isApprovedBuyer: company?.buyerVerificationStatus === 'APPROVED',
    isApprovedSupplier: !!company &&
      company.supplierVerificationStatus === 'APPROVED' &&
      supplierEligible,
  }
}
