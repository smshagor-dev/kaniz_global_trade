import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { logCreate, logUpdate } from '@/lib/utils/audit'
import { hashPassword } from '@/lib/auth/password'

const createUserSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
  phone: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).default('ACTIVE'),
  emailVerified: z.boolean().default(false),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)

    const search = searchParams.get('q')
    const status = searchParams.get('status')
    const role   = searchParams.get('role')
    const verification = searchParams.get('verification')

    const where: Record<string, unknown> = { deletedAt: null }
    if (status) where.status = status
    if (verification === 'VERIFIED') where.emailVerified = { not: null }
    if (verification === 'UNVERIFIED') where.emailVerified = null
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ]
    }
    if (role === 'SUPPLIER') {
      where.roles = {
        some: {
          role: {
            name: {
              in: ['SUPPLIER_OWNER', 'SUPPLIER_STAFF'],
            },
          },
        },
      }
    } else if (role === 'BUYER') {
      where.roles = { some: { role: { name: 'BUYER' } } }
    } else if (role) {
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
          phone: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          roles: { include: { role: { select: { name: true } } } },
          companyUsers: { select: { company: { select: { id: true, name: true } } } },
          kycProfile: {
            select: {
              id: true,
              status: true,
              reviewedAt: true,
            },
          },
          b2bCompanyOwned: {
            select: {
              id: true,
              companyName: true,
              companyType: true,
              buyerVerificationStatus: true,
              supplierVerificationStatus: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    return successResponse(users, 'Users fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAdmin(req)
    const data = createUserSchema.parse(await req.json())

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    })
    if (existing) throw new ApiError(409, 'Email already registered')

    const roleRecords = await prisma.role.findMany({
      where: { name: { in: data.roles } },
    })
    if (roleRecords.length !== data.roles.length) {
      throw new ApiError(400, 'One or more selected roles are invalid')
    }

    const password = await hashPassword(data.password)

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password,
          phone: data.phone || null,
          status: data.status,
          emailVerified: data.emailVerified ? new Date() : null,
        },
      })

      await tx.userRole.createMany({
        data: roleRecords.map((role) => ({
          userId: createdUser.id,
          roleId: role.id,
        })),
      })

      await tx.notificationPreference.create({
        data: { userId: createdUser.id },
      })

      return createdUser
    })

    await logCreate(authUser.userId, 'admin/users', 'User', user.id, {
      email: user.email,
      status: user.status,
      roles: data.roles,
    })

    return successResponse(user, 'User created successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireAdmin(req)
    const { userId, firstName, lastName, email, phone, password, status, emailVerified, roles } = z.object({
      userId: z.string(),
      firstName: z.string().min(2).max(50).optional(),
      lastName: z.string().min(2).max(50).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional().or(z.literal('')),
      password: z
        .string()
        .min(8)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number')
        .optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
      emailVerified: z.boolean().optional(),
      roles:  z.array(z.string()).optional(),
    }).parse(await req.json())

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'User not found')

    const updates: Record<string, unknown> = {}
    if (firstName) updates.firstName = firstName
    if (lastName) updates.lastName = lastName
    if (email && email !== user.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId },
        },
        select: { id: true },
      })
      if (existing) throw new ApiError(409, 'Email already registered')
      updates.email = email
    }
    if (phone !== undefined) updates.phone = phone || null
    if (password) updates.password = await hashPassword(password)
    if (status) updates.status = status
    if (emailVerified !== undefined) updates.emailVerified = emailVerified ? user.emailVerified || new Date() : null

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

    await logUpdate(authUser.userId, 'admin/users', 'User', userId, user, { ...updates, roles })
    return successResponse(null, 'User updated')
  } catch (error) {
    return handleApiError(error)
  }
}
