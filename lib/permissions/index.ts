import prisma from '@/lib/db/prisma'
import { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  SUPPLIER_OWNER: 'SUPPLIER_OWNER',
  SUPPLIER_STAFF: 'SUPPLIER_STAFF',
  BUYER: 'BUYER',
  GUEST: 'GUEST',
} as const

export const PERMISSIONS = {
  // User management
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_SUSPEND: 'user:suspend',

  // Company management
  COMPANY_VIEW: 'company:view',
  COMPANY_CREATE: 'company:create',
  COMPANY_UPDATE: 'company:update',
  COMPANY_DELETE: 'company:delete',
  COMPANY_VERIFY: 'company:verify',
  COMPANY_FEATURE: 'company:feature',

  // Product management
  PRODUCT_VIEW: 'product:view',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_APPROVE: 'product:approve',
  PRODUCT_FEATURE: 'product:feature',

  // Inquiry management
  INQUIRY_VIEW: 'inquiry:view',
  INQUIRY_REPLY: 'inquiry:reply',
  INQUIRY_CLOSE: 'inquiry:close',
  INQUIRY_MANAGE: 'inquiry:manage',

  // RFQ management
  RFQ_CREATE: 'rfq:create',
  RFQ_VIEW: 'rfq:view',
  RFQ_MANAGE: 'rfq:manage',

  // Quotation management
  QUOTATION_CREATE: 'quotation:create',
  QUOTATION_VIEW: 'quotation:view',
  QUOTATION_MANAGE: 'quotation:manage',

  // Chat
  CHAT_ACCESS: 'chat:access',
  CHAT_MODERATE: 'chat:moderate',

  // Admin
  ADMIN_ACCESS: 'admin:access',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_REPORTS: 'admin:reports',
  ADMIN_LOGS: 'admin:logs',

  // Subscription
  SUBSCRIPTION_MANAGE: 'subscription:manage',
  SUBSCRIPTION_VIEW: 'subscription:view',

  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_ADMIN: 'analytics:admin',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

export interface AuthUser {
  userId: string
  email: string
  roles: string[]
  permissions: string[]
  companyId?: string
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null

  if (!token) return null

  try {
    const payload = verifyAccessToken(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        companyUsers: { select: { companyId: true, isPrimary: true } },
      },
    })

    if (!user || user.status === 'SUSPENDED') return null

    const roles = user.roles.map((ur) => ur.role.name)
    const permissions = user.roles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.name)
    )
    const primaryCompany = user.companyUsers.find((cu) => cu.isPrimary)

    return {
      userId: user.id,
      email: user.email,
      roles,
      permissions: [...new Set(permissions)],
      companyId: primaryCompany?.companyId,
    }
  } catch {
    return null
  }
}

export function hasRole(user: AuthUser, ...roles: string[]): boolean {
  if (user.roles.includes(ROLES.SUPER_ADMIN)) return true
  return roles.some((r) => user.roles.includes(r))
}

export function hasPermission(
  user: AuthUser,
  ...permissions: Permission[]
): boolean {
  if (user.roles.includes(ROLES.SUPER_ADMIN)) return true
  return permissions.some((p) => user.permissions.includes(p))
}

export function isSuperAdmin(user: AuthUser): boolean {
  return user.roles.includes(ROLES.SUPER_ADMIN)
}

export function isAdmin(user: AuthUser): boolean {
  return (
    user.roles.includes(ROLES.SUPER_ADMIN) ||
    user.roles.includes(ROLES.ADMIN)
  )
}

export function isSupplier(user: AuthUser): boolean {
  return (
    user.roles.includes(ROLES.SUPPLIER_OWNER) ||
    user.roles.includes(ROLES.SUPPLIER_STAFF)
  )
}

export function isBuyer(user: AuthUser): boolean {
  return user.roles.includes(ROLES.BUYER)
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(req)
  if (!user) throw new ApiError(401, 'Authentication required')
  return user
}

export async function requireAdmin(req: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(req)
  if (!isAdmin(user)) throw new ApiError(403, 'Admin access required')
  return user
}

export async function requireSupplier(req: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(req)
  if (!isSupplier(user)) throw new ApiError(403, 'Supplier access required')
  return user
}

export async function requireCompanyAccess(
  req: NextRequest,
  companyId: string
): Promise<AuthUser> {
  const user = await requireAuth(req)
  if (isAdmin(user)) return user

  const companyUser = await prisma.companyUser.findUnique({
    where: {
      companyId_userId: {
        companyId,
        userId: user.userId,
      },
    },
  })

  if (!companyUser)
    throw new ApiError(403, 'Access denied: Not a member of this company')

  return { ...user, companyId }
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: Record<string, string>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
