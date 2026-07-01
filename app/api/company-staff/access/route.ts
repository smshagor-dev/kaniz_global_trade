import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { ApiError, ROLES, requireSupplier } from '@/lib/permissions'
import {
  getAllSupplierDashboardSectionKeys,
  getSupplierDashboardDefaultHref,
  getSupplierStaffRoleDefinitions,
  resolveSupplierDashboardAccess,
  supplierDashboardSections,
} from '@/lib/supplier-dashboard-access'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { hasPackageAccess } from '@/lib/packages'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireSupplier(req)

    const companyUser = await prisma.companyUser.findFirst({
      where: { userId: authUser.userId },
      select: {
        isPrimary: true,
        permissions: true,
        company: {
          select: {
            subscription: {
              select: {
                status: true,
                currentPeriodEnd: true,
              },
            },
            companyUsers: {
              where: { isPrimary: true },
              select: {
                permissions: true,
              },
              take: 1,
            },
          },
        },
      },
    })

    if (!companyUser) {
      throw new ApiError(404, 'Supplier company membership not found')
    }

    const isOwner = authUser.roles.includes(ROLES.SUPPLIER_OWNER) || companyUser.isPrimary
    const companyRoles = getSupplierStaffRoleDefinitions(companyUser.company.companyUsers[0]?.permissions)
    const dashboardAccess = isOwner
      ? getAllSupplierDashboardSectionKeys()
      : resolveSupplierDashboardAccess(companyUser.permissions, companyRoles)
    const packageRequired = isOwner && !hasPackageAccess(companyUser.company.subscription)

    return successResponse({
      isOwner,
      dashboardAccess,
      packageRequired,
      defaultHref: packageRequired ? '/dashboard/packages' : getSupplierDashboardDefaultHref(dashboardAccess),
      availableSections: supplierDashboardSections,
    }, 'Supplier dashboard access fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
