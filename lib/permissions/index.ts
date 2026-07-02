import prisma from '@/lib/db/prisma'
import { NextRequest } from 'next/server'
import { FraudRiskLevel } from '@prisma/client'
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

export interface ChatAccessUser {
  userId: string
  roles: string[]
  companyId?: string
}

export interface ChatRoomAccess {
  room: {
    id: string
    companyId: string | null
    inquiryId: string | null
    participants: Array<{
      userId: string
      isAdmin: boolean
      isBlocked: boolean
      user: {
        roles: Array<{
          role: {
            name: string
          }
        }>
      }
    }>
  }
  participant: {
    userId: string
    isAdmin: boolean
    isBlocked: boolean
  }
}

const VERIFIED_MARKETPLACE_COMPANY_STATUSES = new Set(['ADMIN_VERIFIED', 'PREMIUM_VERIFIED'])

export type ComplianceAudience = 'BUYER' | 'SUPPLIER'

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

    if (!user || user.status === 'SUSPENDED' || user.fraudRiskLevel === FraudRiskLevel.BLOCKED) return null

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

function isRequestLike(value: NextRequest | AuthUser): value is NextRequest {
  return typeof (value as NextRequest).headers?.get === 'function'
}

async function resolveAuthUser(input: NextRequest | AuthUser): Promise<AuthUser> {
  if (isRequestLike(input)) {
    return requireAuth(input)
  }

  return input
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(req)
  if (!user) throw new ApiError(401, 'Authentication required')
  return user
}

export async function requireRole(
  input: NextRequest | AuthUser,
  ...roles: string[]
): Promise<AuthUser> {
  const user = await resolveAuthUser(input)
  if (!hasRole(user, ...roles)) {
    throw new ApiError(403, `${roles.join(' / ')} access required`)
  }
  return user
}

export async function requireAdmin(input: NextRequest | AuthUser): Promise<AuthUser> {
  const user = await resolveAuthUser(input)
  if (!isAdmin(user)) throw new ApiError(403, 'Kaniz Global Trade team access required')
  return user
}

export async function requireSupplier(input: NextRequest | AuthUser): Promise<AuthUser> {
  const user = await resolveAuthUser(input)
  if (!isSupplier(user)) throw new ApiError(403, 'Supplier access required')
  return user
}

export async function requireCompanyAccess(
  input: NextRequest | AuthUser,
  companyId: string
): Promise<AuthUser> {
  const user = await resolveAuthUser(input)
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

export async function requireVerifiedSupplier(
  input: NextRequest | AuthUser,
  companyId?: string
): Promise<AuthUser> {
  const user = await resolveAuthUser(input)
  if (isAdmin(user)) return user
  if (!isSupplier(user)) {
    throw new ApiError(403, 'Supplier access required')
  }

  const effectiveCompanyId = companyId || user.companyId
  if (!effectiveCompanyId) {
    throw new ApiError(403, 'A supplier company is required before you can continue.')
  }

  const companyUser = await requireCompanyAccess(user, effectiveCompanyId)
  await assertComplianceAccess({
    userId: companyUser.userId,
    audience: 'SUPPLIER',
    companyId: effectiveCompanyId,
  })

  return companyUser
}

export async function requireVerifiedBuyer(
  input: NextRequest | AuthUser
): Promise<AuthUser> {
  const user = await resolveAuthUser(input)
  if (!isBuyer(user) && !isAdmin(user)) {
    throw new ApiError(403, 'Buyer access required')
  }
  if (isAdmin(user)) return user

  await assertComplianceAccess({
    userId: user.userId,
    audience: 'BUYER',
  })

  return user
}

export async function requireChatRoomAccess(input: {
  user: ChatAccessUser
  roomId: string
  requireAdminRoom?: boolean
}): Promise<ChatRoomAccess> {
  const room = await prisma.chatRoom.findUnique({
    where: { id: input.roomId },
    select: {
      id: true,
      companyId: true,
      inquiryId: true,
      participants: {
        select: {
          userId: true,
          isAdmin: true,
          isBlocked: true,
          user: {
            select: {
              roles: {
                include: {
                  role: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!room) {
    throw new ApiError(404, 'Chat room not found')
  }

  const participant = room.participants.find((entry) => entry.userId === input.user.userId)
  if (!participant || participant.isBlocked) {
    throw new ApiError(403, 'Access denied')
  }

  const hasAdminParticipant = room.participants.some((entry) => entry.isAdmin)
  if ((input.requireAdminRoom || hasAdminParticipant) && !isAdmin({ ...input.user, email: '', permissions: [] })) {
    throw new ApiError(403, 'Admin chat access required')
  }

  if (!hasAdminParticipant && room.companyId) {
    const companyId = room.companyId
    const relationshipExists = await prisma.$transaction(async (tx) => {
      if (room.inquiryId) {
        const inquiry = await tx.inquiry.findUnique({
          where: { id: room.inquiryId, deletedAt: null },
          select: { id: true, buyerId: true, companyId: true },
        })

        if (!inquiry || inquiry.companyId !== companyId) {
          return false
        }

        const isBuyerParticipant = room.participants.some((entry) => entry.userId === inquiry.buyerId)
        const supplierParticipantIds = room.participants
          .filter((entry) => entry.userId !== inquiry.buyerId)
          .map((entry) => entry.userId)

        if (!isBuyerParticipant || supplierParticipantIds.length === 0) {
          return false
        }

        const supplierMembership = await tx.companyUser.findFirst({
          where: {
            companyId,
            userId: { in: supplierParticipantIds },
          },
          select: { userId: true },
        })

        return !!supplierMembership
      }

      const participantIds = room.participants.map((entry) => entry.userId)
      if (participantIds.length < 2) {
        return false
      }

      const [hasInquiry, hasQuotation, hasTradeOrder] = await Promise.all([
        tx.inquiry.findFirst({
          where: {
            deletedAt: null,
            companyId,
            buyerId: { in: participantIds },
          },
          select: { id: true },
        }),
        tx.rFQQuotation.findFirst({
          where: {
            companyId,
            buyerId: { in: participantIds },
          },
          select: { id: true },
        }),
        tx.tradeOrder.findFirst({
          where: {
            supplierCompanyId: companyId,
            buyerId: { in: participantIds },
          },
          select: { id: true },
        }),
      ])

      return !!(hasInquiry || hasQuotation || hasTradeOrder)
    })

    if (!relationshipExists) {
      throw new ApiError(403, 'Access denied')
    }
  }

  return { room, participant }
}

export async function assertComplianceAccess(input: {
  userId: string
  audience: ComplianceAudience
  companyId?: string
}) {
  if (input.audience === 'BUYER') {
    const [kycProfile, b2bCompany] = await Promise.all([
      prisma.kYCProfile.findUnique({
        where: { userId: input.userId },
        select: { status: true },
      }),
      prisma.b2BCompany.findUnique({
        where: { userId: input.userId },
        select: { buyerVerificationStatus: true },
      }),
    ])

    if (kycProfile?.status !== 'VERIFIED') {
      throw new ApiError(403, 'Your KYC must be verified before you can continue buyer actions.')
    }

    if (b2bCompany?.buyerVerificationStatus !== 'APPROVED') {
      throw new ApiError(403, 'Your buyer company verification must be approved before you can continue.')
    }

    return
  }

  if (!input.companyId) {
    throw new ApiError(403, 'A verified supplier company is required before you can continue.')
  }

  const primaryCompanyUser = await prisma.companyUser.findFirst({
    where: { companyId: input.companyId, isPrimary: true },
    select: { userId: true },
  })

  const complianceUserId = primaryCompanyUser?.userId || input.userId

  const [kycProfile, b2bCompany, company] = await Promise.all([
    prisma.kYCProfile.findUnique({
      where: { userId: complianceUserId },
      select: { status: true },
    }),
    prisma.b2BCompany.findUnique({
      where: { userId: complianceUserId },
      select: { supplierVerificationStatus: true },
    }),
    prisma.company.findUnique({
      where: { id: input.companyId },
      select: { verificationStatus: true },
    }),
  ])

  if (kycProfile?.status !== 'VERIFIED') {
    throw new ApiError(403, 'Supplier KYC must be verified before you can continue this action.')
  }

  if (b2bCompany?.supplierVerificationStatus !== 'APPROVED') {
    throw new ApiError(403, 'Your supplier company verification must be approved before you can continue.')
  }

  if (!company || !VERIFIED_MARKETPLACE_COMPANY_STATUSES.has(company.verificationStatus)) {
    throw new ApiError(403, 'Your marketplace company verification must be approved before you can continue.')
  }
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
