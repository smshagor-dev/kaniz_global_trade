import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { logUpdate } from '@/lib/utils/audit'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)

    const search = searchParams.get('q')
    const status = searchParams.get('status')
    const role   = searchParams.get('role')

    const where: Record<string, unknown> = { deletedAt: null }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ]
    }
    if (role) {
      where.roles = { some: { role: { name: role } } }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          roles: { include: { role: { select: { name: true } } } },
          companyUsers: { select: { company: { select: { id: true, name: true } } } },
        },
      }),
      prisma.user.count({ where }),
    ])

    return successResponse(users, 'Users fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireAdmin(req)
    const { userId, status, roles } = z.object({
      userId: z.string(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
      roles:  z.array(z.string()).optional(),
    }).parse(await req.json())

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'User not found')

    const updates: Record<string, unknown> = {}
    if (status) updates.status = status

    if (Object.keys(updates).length) {
      await prisma.user.update({ where: { id: userId }, data: updates })
    }

    if (roles) {
      const roleRecords = await prisma.role.findMany({ where: { name: { in: roles } } })
      await prisma.userRole.deleteMany({ where: { userId } })
      await prisma.userRole.createMany({
        data: roleRecords.map((r) => ({ userId, roleId: r.id })),
      })
    }

    await logUpdate(authUser.userId, 'admin/users', 'User', userId, user, updates)
    return successResponse(null, 'User updated')
  } catch (error) {
    return handleApiError(error)
  }
}
