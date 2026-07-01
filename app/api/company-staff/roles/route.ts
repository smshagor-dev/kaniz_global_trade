import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, ROLES, requireSupplier } from '@/lib/permissions'
import {
  getAssignedSupplierStaffRoleId,
  getSupplierStaffRoleDefinitions,
  serializeSupplierStaffPermissions,
  supplierDashboardSections,
} from '@/lib/supplier-dashboard-access'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { logCreate, logDelete, logUpdate } from '@/lib/utils/audit'

const createCompanyRoleSchema = z.object({
  name: z.string().min(2).max(60),
  dashboardAccess: z.array(z.string()).min(1, 'Select at least one dashboard section'),
})

const updateCompanyRoleSchema = createCompanyRoleSchema.extend({
  id: z.string().min(1),
})

const deleteCompanyRoleSchema = z.object({
  id: z.string().min(1),
})

function normalizeDashboardAccess(dashboardAccess: string[]) {
  const validSectionKeys = new Set(supplierDashboardSections.map((section) => section.key))
  const normalizedAccess = [...new Set(dashboardAccess)].filter((key) => validSectionKeys.has(key))
  if (!normalizedAccess.length) {
    throw new ApiError(422, 'Select at least one dashboard section')
  }

  return normalizedAccess
}

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

    const normalizedAccess = normalizeDashboardAccess(data.dashboardAccess)

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

export async function PUT(req: NextRequest) {
  try {
    const authUser = await requireSupplier(req)

    if (!authUser.roles.includes(ROLES.SUPPLIER_OWNER)) {
      throw new ApiError(403, 'Only supplier owners can update staff roles')
    }

    const data = updateCompanyRoleSchema.parse(await req.json())

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
    const roleToUpdate = existingRoles.find((role) => role.id === data.id)
    if (!roleToUpdate) {
      throw new ApiError(404, 'Staff role not found')
    }

    if (existingRoles.some((role) => role.id !== data.id && role.name.toLowerCase() === data.name.trim().toLowerCase())) {
      throw new ApiError(409, 'A staff role with this name already exists')
    }

    const updatedRole = {
      id: data.id,
      name: data.name.trim(),
      dashboardAccess: normalizeDashboardAccess(data.dashboardAccess),
    }

    await prisma.companyUser.update({
      where: { id: companyUser.id },
      data: {
        permissions: serializeSupplierStaffPermissions({
          companyRoles: existingRoles.map((role) => role.id === data.id ? updatedRole : role),
        }),
      },
    })

    await logUpdate(authUser.userId, 'company-staff-roles', 'CompanyStaffRole', updatedRole.id, roleToUpdate, {
      companyId: companyUser.companyId,
      name: updatedRole.name,
      dashboardAccess: updatedRole.dashboardAccess,
    })

    return successResponse(updatedRole, 'Staff role updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await requireSupplier(req)

    if (!authUser.roles.includes(ROLES.SUPPLIER_OWNER)) {
      throw new ApiError(403, 'Only supplier owners can delete staff roles')
    }

    const data = deleteCompanyRoleSchema.parse(await req.json())

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
    const roleToDelete = existingRoles.find((role) => role.id === data.id)
    if (!roleToDelete) {
      throw new ApiError(404, 'Staff role not found')
    }

    const assignedStaff = await prisma.companyUser.findMany({
      where: {
        companyId: companyUser.companyId,
        isPrimary: false,
      },
      select: {
        permissions: true,
      },
    })

    if (assignedStaff.some((member) => getAssignedSupplierStaffRoleId(member.permissions) === data.id)) {
      throw new ApiError(409, 'This role is assigned to staff. Reassign staff before deleting it.')
    }

    await prisma.companyUser.update({
      where: { id: companyUser.id },
      data: {
        permissions: serializeSupplierStaffPermissions({
          companyRoles: existingRoles.filter((role) => role.id !== data.id),
        }),
      },
    })

    await logDelete(authUser.userId, 'company-staff-roles', 'CompanyStaffRole', roleToDelete.id)

    return successResponse(roleToDelete, 'Staff role deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
