import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, ROLES, requireSupplier } from '@/lib/permissions'
import {
  getSupplierStaffRoleDefinitions,
  serializeSupplierStaffPermissions,
  supplierDashboardSections,
} from '@/lib/supplier-dashboard-access'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { logCreate } from '@/lib/utils/audit'

const createCompanyRoleSchema = z.object({
  name: z.string().min(2).max(60),
  dashboardAccess: z.array(z.string()).min(1, 'Select at least one dashboard section'),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireSupplier(req)

    const companyUser = await prisma.companyUser.findFirst({
      where: { userId: authUser.userId },
      select: {
        company: {
          select: {
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

    return successResponse({
      roles: getSupplierStaffRoleDefinitions(companyUser.company.companyUsers[0]?.permissions),
      availableSections: supplierDashboardSections,
    }, 'Company staff roles fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireSupplier(req)

    if (!authUser.roles.includes(ROLES.SUPPLIER_OWNER)) {
      throw new ApiError(403, 'Only supplier owners can create staff roles')
    }

    const data = createCompanyRoleSchema.parse(await req.json())

    const companyUser = await prisma.companyUser.findFirst({
      where: {
        userId: authUser.userId,
        isPrimary: true,
      },
      select: {
        id: true,
        permissions: true,
        companyId: true,
      },
    })

    if (!companyUser) {
      throw new ApiError(404, 'Primary supplier company not found')
    }

    const existingRoles = getSupplierStaffRoleDefinitions(companyUser.permissions)
    if (existingRoles.some((role) => role.name.toLowerCase() === data.name.trim().toLowerCase())) {
      throw new ApiError(409, 'A staff role with this name already exists')
    }

    const validSectionKeys = new Set(supplierDashboardSections.map((section) => section.key))
    const normalizedAccess = [...new Set(data.dashboardAccess)].filter((key) => validSectionKeys.has(key))
    if (!normalizedAccess.length) {
      throw new ApiError(422, 'Select at least one dashboard section')
    }

    const newRole = {
      id: randomUUID(),
      name: data.name.trim(),
      dashboardAccess: normalizedAccess,
    }

    await prisma.companyUser.update({
      where: { id: companyUser.id },
      data: {
        permissions: serializeSupplierStaffPermissions({
          companyRoles: [...existingRoles, newRole],
        }),
      },
    })

    await logCreate(authUser.userId, 'company-staff-roles', 'CompanyStaffRole', newRole.id, {
      companyId: companyUser.companyId,
      name: newRole.name,
      dashboardAccess: newRole.dashboardAccess,
    })

    return successResponse(newRole, 'Staff role created successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
