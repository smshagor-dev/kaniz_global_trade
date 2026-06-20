import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { logUpdate } from '@/lib/utils/audit'

const updateRoleSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(300).optional().or(z.literal('')),
  permissionIds: z.array(z.string()).default([]),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAdmin(req)
    const { id } = await params
    const payload = updateRoleSchema.parse(await req.json())

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: true,
      },
    })

    if (!role) throw new ApiError(404, 'Role not found')

    const normalizedName = payload.name.trim().toUpperCase().replace(/\s+/g, '_')

    if (role.isSystem && normalizedName !== role.name) {
      throw new ApiError(400, 'System role name cannot be changed')
    }

    const conflict = await prisma.role.findFirst({
      where: {
        name: normalizedName,
        id: { not: id },
      },
      select: { id: true },
    })
    if (conflict) throw new ApiError(409, 'Role name already exists')

    const permissions = payload.permissionIds.length
      ? await prisma.permission.findMany({ where: { id: { in: payload.permissionIds } } })
      : []

    if (permissions.length !== payload.permissionIds.length) {
      throw new ApiError(400, 'One or more selected permissions are invalid')
    }

    const updatedRole = await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name: role.isSystem ? role.name : normalizedName,
          description: payload.description?.trim() || null,
        },
      })

      await tx.rolePermission.deleteMany({ where: { roleId: id } })

      if (permissions.length) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: id,
            permissionId: permission.id,
          })),
        })
      }

      return tx.role.findUniqueOrThrow({
        where: { id },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
          userRoles: {
            select: { id: true },
          },
        },
      })
    })

    await logUpdate(authUser.userId, 'admin/roles', 'Role', id, role, {
      name: updatedRole.name,
      description: updatedRole.description,
      permissionIds: payload.permissionIds,
    })

    return successResponse(updatedRole, 'Role updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
