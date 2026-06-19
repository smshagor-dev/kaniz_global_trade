import prisma from '@/lib/db/prisma'
import { AuditAction } from '@prisma/client'

interface AuditLogParams {
  userId?: string
  action: AuditAction
  module: string
  targetType?: string
  targetId?: string
  oldData?: unknown
  newData?: unknown
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        module: params.module,
        targetType: params.targetType,
        targetId: params.targetId,
        oldData: params.oldData ? JSON.stringify(params.oldData) : null,
        newData: params.newData ? JSON.stringify(params.newData) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch (err) {
    // Don't let audit log failures break the main flow
    console.error('Audit log error:', err)
  }
}

export async function logLogin(userId: string, ipAddress?: string, userAgent?: string) {
  return createAuditLog({ userId, action: 'LOGIN', module: 'auth', ipAddress, userAgent })
}

export async function logLogout(userId: string, ipAddress?: string) {
  return createAuditLog({ userId, action: 'LOGOUT', module: 'auth', ipAddress })
}

export async function logCreate(userId: string, module: string, targetType: string, targetId: string, data?: unknown) {
  return createAuditLog({ userId, action: 'CREATE', module, targetType, targetId, newData: data })
}

export async function logUpdate(userId: string, module: string, targetType: string, targetId: string, oldData?: unknown, newData?: unknown) {
  return createAuditLog({ userId, action: 'UPDATE', module, targetType, targetId, oldData, newData })
}

export async function logDelete(userId: string, module: string, targetType: string, targetId: string) {
  return createAuditLog({ userId, action: 'DELETE', module, targetType, targetId })
}

export async function logApprove(userId: string, module: string, targetType: string, targetId: string) {
  return createAuditLog({ userId, action: 'APPROVE', module, targetType, targetId })
}

export async function logReject(userId: string, module: string, targetType: string, targetId: string, reason?: string) {
  return createAuditLog({ userId, action: 'REJECT', module, targetType, targetId, newData: { reason } })
}
