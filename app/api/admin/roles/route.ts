import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { createdResponse, handleApiError, successResponse } from '@/lib/utils/api'
import { logCreate } from '@/lib/utils/audit'

const createRoleSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(300).optional().or(z.literal('')),
  permissionIds: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          userRoles: {
            select: { id: true },
          },
        },
      }),
      prisma.permission.findMany({
        orderBy: [{ module: 'asc' }, { action: 'asc' }, { name: 'asc' }],
      }),
    ])

    return successResponse({ roles, permissions }, 'Roles and permissions fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAdmin(req)
    const payload = createRoleSchema.parse(await req.json())
    const normalizedName = payload.name.trim().toUpperCase().replace(/\s+/g, '_')

    const existingRole = await prisma.role.findUnique({ where: { name: normalizedName } })
    if (existingRole) throw new ApiError(409, 'Role name already exists')

    const permissions = payload.permissionIds.length
      ? await prisma.permission.findMany({ where: { id: { in: payload.permissionIds } } })
      : []

    if (permissions.length !== payload.permissionIds.length) {
      throw new ApiError(400, 'One or more selected permissions are invalid')
    }

    const role = await prisma.role.create({
      data: {
        name: normalizedName,
        description: payload.description?.trim() || null,
        isSystem: false,
        rolePermissions: {
          create: permissions.map((permission) => ({
            permissionId: permission.id,
          })),
        },
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        userRoles: {
          select: { id: true },
        },
      },
    })

    await logCreate(authUser.userId, 'admin/roles', 'Role', role.id, {
      name: role.name,
      description: role.description,
      permissionIds: payload.permissionIds,
    })

    return createdResponse(role, 'Role created successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
