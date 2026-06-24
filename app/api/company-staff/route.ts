import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/password'
import { ApiError, ROLES, requireSupplier } from '@/lib/permissions'
import {
  getAssignedSupplierStaffRoleId,
  getSupplierStaffRoleDefinitions,
  resolveSupplierDashboardAccess,
  serializeSupplierStaffPermissions,
  supplierDashboardSections,
} from '@/lib/supplier-dashboard-access'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { logCreate } from '@/lib/utils/audit'

const createStaffSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
  phone: z.string().optional().or(z.literal('')),
  title: z.string().max(100).optional().or(z.literal('')),
  staffRoleId: z.string().min(1, 'Select a staff role'),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireSupplier(req)

    const companyUser = await prisma.companyUser.findFirst({
      where: { userId: authUser.userId },
      select: {
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            companyUsers: {
              where: { isPrimary: true },
              select: {
                permissions: true,
              },
              take: 1,
            },
            subscription: {
              select: {
                status: true,
                plan: {
                  select: {
                    name: true,
                    maxStaff: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!companyUser?.company) {
      throw new ApiError(404, 'No supplier company found for this account')
    }

    const companyRoles = getSupplierStaffRoleDefinitions(companyUser.company.companyUsers[0]?.permissions)

    const staffMembers = await prisma.companyUser.findMany({
      where: { companyId: companyUser.companyId },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        title: true,
        permissions: true,
        isPrimary: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            lastLoginAt: true,
            roles: {
              select: {
                role: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    })

    return successResponse({
      company: companyUser.company,
      companyRoles,
      availableSections: supplierDashboardSections,
      members: staffMembers.map((member) => ({
        assignedRoleId: member.isPrimary ? null : getAssignedSupplierStaffRoleId(member.permissions),
        assignedRoleName: member.isPrimary
          ? 'Owner'
          : companyRoles.find((role) => role.id === getAssignedSupplierStaffRoleId(member.permissions))?.name || 'Unassigned role',
        id: member.id,
        title: member.title,
        permissions: member.permissions,
        dashboardAccess: member.isPrimary
          ? supplierDashboardSections.map((section) => section.key)
          : resolveSupplierDashboardAccess(member.permissions, companyRoles),
        isPrimary: member.isPrimary,
        createdAt: member.createdAt,
        user: {
          id: member.user.id,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          email: member.user.email,
          status: member.user.status,
          lastLoginAt: member.user.lastLoginAt,
          roles: member.user.roles.map((role) => role.role.name),
        },
      })),
    }, 'Company staff fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireSupplier(req)

    if (!authUser.roles.includes(ROLES.SUPPLIER_OWNER)) {
      throw new ApiError(403, 'Only supplier owners can create staff accounts')
    }

    const data = createStaffSchema.parse(await req.json())

    const companyUser = await prisma.companyUser.findFirst({
      where: {
        userId: authUser.userId,
        isPrimary: true,
      },
      select: {
        companyId: true,
        permissions: true,
        company: {
          select: {
            name: true,
            subscription: {
              select: {
                plan: {
                  select: {
                    maxStaff: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!companyUser?.companyId) {
      throw new ApiError(404, 'Primary supplier company not found')
    }

    const [existingUser, staffRole, currentStaffCount] = await Promise.all([
      prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      }),
      prisma.role.findUnique({
        where: { name: ROLES.SUPPLIER_STAFF },
        select: { id: true },
      }),
      prisma.companyUser.count({
        where: {
          companyId: companyUser.companyId,
          isPrimary: false,
        },
      }),
    ])

    if (existingUser) {
      throw new ApiError(409, 'Email already registered')
    }

    if (!staffRole) {
      throw new ApiError(500, 'Supplier staff role is not configured')
    }

    const companyRoles = getSupplierStaffRoleDefinitions(companyUser.permissions)
    const selectedCompanyRole = companyRoles.find((role) => role.id === data.staffRoleId)
    if (!selectedCompanyRole) {
      throw new ApiError(422, 'Selected staff role is invalid')
    }

    const maxStaff = companyUser.company.subscription?.plan.maxStaff ?? 1
    if (currentStaffCount >= maxStaff) {
      throw new ApiError(403, `Your current plan allows up to ${maxStaff} staff account${maxStaff === 1 ? '' : 's'}`)
    }

    const password = await hashPassword(data.password)

    const createdStaff = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password,
          phone: data.phone || null,
          status: 'ACTIVE',
          emailVerified: new Date(),
        },
      })

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: staffRole.id,
        },
      })

      await tx.notificationPreference.create({
        data: { userId: user.id },
      })

      await tx.companyUser.create({
        data: {
          companyId: companyUser.companyId,
          userId: user.id,
          title: data.title || null,
          permissions: serializeSupplierStaffPermissions({
            staffRoleId: selectedCompanyRole.id,
          }),
          isPrimary: false,
        },
      })

      return user
    })

    await logCreate(authUser.userId, 'company-staff', 'User', createdStaff.id, {
      email: createdStaff.email,
      companyId: companyUser.companyId,
      companyName: companyUser.company.name,
      role: ROLES.SUPPLIER_STAFF,
      staffRoleId: selectedCompanyRole.id,
      staffRoleName: selectedCompanyRole.name,
    })

    return successResponse({
      id: createdStaff.id,
      email: createdStaff.email,
    }, 'Staff account created successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
