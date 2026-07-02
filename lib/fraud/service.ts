import { FraudEntityType, FraudEventType, FraudPublicFlag, FraudReviewDecision, FraudRiskLevel, NotificationType } from '@prisma/client'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { ApiError, ROLES } from '@/lib/permissions'
import { createAuditLog } from '@/lib/utils/audit'
import { createNotification } from '@/server/services/notification'
import { runFraudAIAnalysis } from '@/lib/fraud/ai'
import {
  clampRiskScore,
  FRAUD_ACTIONS,
  type FraudAction,
  getDeviceFingerprint,
  getRequestIp,
  getRequestUserAgent,
  parseRestrictedActions,
  publicFlagFromRisk,
  RED_LINE_LEVELS,
  restrictionsForRisk,
  riskLevelFromScore,
  serializeRestrictedActions,
} from '@/lib/fraud/shared'

type FraudRuleEvaluation = {
  score: number
  signals: string[]
}

type FraudScreeningInput = {
  req: NextRequest | Request
  actorUserId: string
  userId?: string | null
  companyId?: string | null
  eventType: FraudEventType
  sourceModule: string
  title: string
  summary?: string
  payload?: Record<string, unknown>
}

function extractNumericValue(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

function payloadContainsKeywords(payload: Record<string, unknown>, keywords: string[]) {
  const haystack = JSON.stringify(payload).toLowerCase()
  return keywords.some((keyword) => haystack.includes(keyword))
}

async function evaluateRules(input: FraudScreeningInput): Promise<FraudRuleEvaluation> {
  const signals: string[] = []
  let score = 0
  const payload = input.payload || {}
  const alertTargets: Array<{ targetUserId?: string; targetCompanyId?: string }> = []
  const tradeSensitiveEvents: FraudEventType[] = [
    FraudEventType.PRODUCT_CREATE,
    FraudEventType.RFQ_CREATE,
    FraudEventType.QUOTATION_CREATE,
    FraudEventType.ORDER_CREATE,
    FraudEventType.PAYMENT_ACTIVITY,
  ]
  const profileSensitiveEvents: FraudEventType[] = [
    FraudEventType.COMPANY_UPDATE,
    FraudEventType.PROFILE_UPDATE,
    FraudEventType.KYC_SUBMISSION,
  ]
  const copySensitiveEvents: FraudEventType[] = [
    FraudEventType.PRODUCT_CREATE,
    FraudEventType.QUOTATION_CREATE,
    FraudEventType.INQUIRY_CREATE,
  ]
  if (input.userId) alertTargets.push({ targetUserId: input.userId })
  if (input.companyId) alertTargets.push({ targetCompanyId: input.companyId })

  const [openAlerts, repeatedEventsToday, otherUsersOnIp, activeKyc] = await Promise.all([
    prisma.fraudAlert.count({
      where: {
        OR: alertTargets,
        status: { in: ['OPEN', 'INVESTIGATING', 'WATCHLIST'] },
      },
    }),
    prisma.fraudRiskHistory.count({
      where: {
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.user.count({
      where: {
        id: { not: input.actorUserId },
        lastLoginIp: getRequestIp(input.req),
        deletedAt: null,
      },
    }),
    input.userId
      ? prisma.kYCProfile.findUnique({
          where: { userId: input.userId },
          select: { status: true },
        })
      : Promise.resolve(null),
  ])

  if (openAlerts > 0) {
    score += Math.min(30, openAlerts * 12)
    signals.push(`${openAlerts} active fraud alerts`)
  }

  if (repeatedEventsToday >= 4) {
    score += 14
    signals.push('Repeated high-frequency activity in the last 24 hours')
  }

  if (otherUsersOnIp >= 3) {
    score += 16
    signals.push('Shared IP address across multiple accounts')
  }

  if (tradeSensitiveEvents.includes(input.eventType) && (!activeKyc || ['DRAFT', 'REJECTED'].includes(activeKyc.status))) {
    score += 18
    signals.push('Sensitive trade action without completed KYC')
  }

  if (input.eventType === FraudEventType.LOGIN) {
    const user = await prisma.user.findUnique({
      where: { id: input.actorUserId },
      select: { lastLoginIp: true },
    })
    if (user?.lastLoginIp && user.lastLoginIp !== getRequestIp(input.req)) {
      score += 10
      signals.push('Login from a new IP address')
    }
  }

  if (tradeSensitiveEvents.includes(input.eventType)) {
    const value = extractNumericValue(payload, ['budget', 'totalPrice', 'amount', 'priceMax', 'priceMin'])
    if (value >= 50000) {
      score += 24
      signals.push('Very high transaction value')
    } else if (value >= 10000) {
      score += 12
      signals.push('Higher-value transaction activity')
    }
  }

  if (input.eventType === FraudEventType.DOCUMENT_UPLOAD) {
    const fileCount = extractNumericValue(payload, ['fileCount'])
    if (fileCount >= 8) {
      score += 12
      signals.push('Large batch document upload')
    }
  }

  if (profileSensitiveEvents.includes(input.eventType) && payloadContainsKeywords(payload, ['passport', 'nid', 'swift', 'iban', 'routing', 'beneficiary', 'bank'])) {
    score += 8
    signals.push('Sensitive identity or banking details changed')
  }

  if (copySensitiveEvents.includes(input.eventType) && payloadContainsKeywords(payload, ['western union', 'crypto only', 'urgent payment', 'telegram', 'whatsapp only', 'gift card'])) {
    score += 22
    signals.push('Suspicious marketplace phrasing detected')
  }

  if (input.eventType === FraudEventType.REPORT_ACTIVITY) {
    score += 10
    signals.push('New fraud or abuse report opened')
  }

  if (input.eventType === FraudEventType.REGISTRATION) {
    if (payload.role === ROLES.SUPPLIER_OWNER) {
      score += 8
      signals.push('Supplier onboarding requires elevated fraud scrutiny')
    }
    if (!payload.phone) {
      score += 6
      signals.push('Registration missing phone number')
    }
  }

  return { score: clampRiskScore(score), signals }
}

async function notifyRedLine(params: {
  userId?: string | null
  companyId?: string | null
  level: FraudRiskLevel
  title: string
  summary?: string
}) {
  const isRedLine = RED_LINE_LEVELS.includes(params.level)
  if (!isRedLine) return

  const [admins, companyUsers] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: {
          some: {
            role: {
              name: { in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
            },
          },
        },
      },
      select: { id: true },
    }),
    params.companyId
      ? prisma.companyUser.findMany({
          where: { companyId: params.companyId },
          select: { userId: true },
        })
      : Promise.resolve([]),
  ])

  const userIds = new Set<string>()
  if (params.userId) userIds.add(params.userId)
  for (const member of companyUsers) userIds.add(member.userId)

  await Promise.all([
    ...Array.from(userIds).map((userId) =>
      createNotification({
        userId,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title: params.level === FraudRiskLevel.BLOCKED ? 'Account blocked for security review' : 'Account under fraud review',
        message: params.level === FraudRiskLevel.BLOCKED
          ? 'Your marketplace access has been blocked while our team completes a security review.'
          : 'Some marketplace actions are temporarily limited while our team reviews your recent activity.',
        data: {
          fraudLevel: params.level,
          title: params.title,
        },
      })
    ),
    ...admins.map((admin) =>
      createNotification({
        userId: admin.id,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title: 'Fraud red-line triggered',
        message: `${params.title} reached ${params.level} risk.`,
        data: {
          fraudLevel: params.level,
          companyId: params.companyId,
          userId: params.userId,
          summary: params.summary,
        },
      })
    ),
  ])
}

async function persistProfileUpdate(params: {
  entityType: FraudEntityType
  userId?: string | null
  companyId?: string | null
  eventType: FraudEventType
  sourceModule: string
  title: string
  summary?: string
  payload?: Record<string, unknown>
  ruleScore: number
  signals: string[]
  aiScore?: number | null
  aiSummary?: string | null
  aiProvider?: string | null
  aiRaw?: Record<string, unknown> | null
  actorUserId: string
  req: NextRequest | Request
}) {
  const current =
    params.entityType === FraudEntityType.USER && params.userId
      ? await prisma.user.findUnique({
          where: { id: params.userId },
          select: {
            fraudRiskScore: true,
            fraudRiskLevel: true,
            fraudRestrictedActions: true,
            fraudLastNotifiedAt: true,
          },
        })
      : params.entityType === FraudEntityType.COMPANY && params.companyId
        ? await prisma.company.findUnique({
            where: { id: params.companyId },
            select: {
              fraudRiskScore: true,
              fraudRiskLevel: true,
              fraudRestrictedActions: true,
              fraudLastNotifiedAt: true,
            },
          })
        : null

  if (!current) return null

  const aiScore = params.aiScore == null ? null : clampRiskScore(params.aiScore)
  const finalScore = clampRiskScore(
    aiScore == null
      ? params.ruleScore
      : params.ruleScore * 0.65 + aiScore * 0.35
  )
  const resultingScore = current.fraudRiskLevel === FraudRiskLevel.BLOCKED
    ? 100
    : clampRiskScore(current.fraudRiskScore * 0.55 + finalScore * 0.45 + (params.ruleScore >= 30 ? 8 : 0))
  const resultingLevel = current.fraudRiskLevel === FraudRiskLevel.BLOCKED
    ? FraudRiskLevel.BLOCKED
    : riskLevelFromScore(resultingScore)
  const publicFlag = publicFlagFromRisk(resultingLevel)
  const restrictedActions = restrictionsForRisk(resultingLevel)

  const history = await prisma.fraudRiskHistory.create({
    data: {
      entityType: params.entityType,
      userId: params.userId || null,
      companyId: params.companyId || null,
      actorUserId: params.actorUserId,
      eventType: params.eventType,
      sourceModule: params.sourceModule,
      title: params.title,
      summary: params.summary || null,
      payload: params.payload ? JSON.stringify(params.payload) : null,
      matchedRules: JSON.stringify(params.signals),
      aiProvider: params.aiProvider || null,
      aiSummary: params.aiSummary || null,
      aiRaw: params.aiRaw ? JSON.stringify(params.aiRaw) : null,
      ruleScore: params.ruleScore,
      aiScore,
      finalScore,
      resultingScore,
      resultingLevel,
      publicFlag,
      restrictedActions: serializeRestrictedActions(restrictedActions),
      ipAddress: getRequestIp(params.req),
      userAgent: getRequestUserAgent(params.req),
      deviceFingerprint: getDeviceFingerprint(params.req),
      triggeredAlert: RED_LINE_LEVELS.includes(resultingLevel),
    },
  })

  if (params.entityType === FraudEntityType.USER && params.userId) {
    await prisma.user.update({
      where: { id: params.userId },
      data: {
        fraudRiskScore: resultingScore,
        fraudRiskLevel: resultingLevel,
        fraudPublicFlag: publicFlag,
        fraudRestrictedActions: serializeRestrictedActions(restrictedActions),
        fraudNotes: params.aiSummary || params.summary || null,
      },
    })
  }

  if (params.entityType === FraudEntityType.COMPANY && params.companyId) {
    await prisma.company.update({
      where: { id: params.companyId },
      data: {
        fraudRiskScore: resultingScore,
        fraudRiskLevel: resultingLevel,
        fraudPublicFlag: publicFlag,
        fraudRestrictedActions: serializeRestrictedActions(restrictedActions),
        fraudNotes: params.aiSummary || params.summary || null,
      },
    })
  }

  if (RED_LINE_LEVELS.includes(resultingLevel)) {
    await notifyRedLine({
      userId: params.userId,
      companyId: params.companyId,
      level: resultingLevel,
      title: params.title,
      summary: params.summary,
    })
  }

  return {
    historyId: history.id,
    score: resultingScore,
    level: resultingLevel,
    publicFlag,
    restrictedActions,
  }
}

export async function screenFraudEvent(input: FraudScreeningInput) {
  const ruleEvaluation = await evaluateRules(input)
  const aiAnalysis = await runFraudAIAnalysis({
    title: input.title,
    eventType: input.eventType,
    sourceModule: input.sourceModule,
    entityLabel: input.companyId ? 'supplier or buyer company' : 'supplier or buyer user',
    payload: input.payload || {},
    ruleSignals: ruleEvaluation.signals,
  })

  const results = await Promise.all([
    input.userId
      ? persistProfileUpdate({
          entityType: FraudEntityType.USER,
          userId: input.userId,
          eventType: input.eventType,
          sourceModule: input.sourceModule,
          title: input.title,
          summary: input.summary,
          payload: input.payload,
          ruleScore: ruleEvaluation.score,
          signals: ruleEvaluation.signals,
          aiScore: aiAnalysis?.result.riskScore,
          aiSummary: aiAnalysis?.result.summary,
          aiProvider: aiAnalysis?.provider.label,
          aiRaw: aiAnalysis?.result || null,
          actorUserId: input.actorUserId,
          req: input.req,
        })
      : Promise.resolve(null),
    input.companyId
      ? persistProfileUpdate({
          entityType: FraudEntityType.COMPANY,
          companyId: input.companyId,
          eventType: input.eventType,
          sourceModule: input.sourceModule,
          title: input.title,
          summary: input.summary,
          payload: input.payload,
          ruleScore: Math.min(100, ruleEvaluation.score + (input.eventType === FraudEventType.PRODUCT_CREATE ? 6 : 0)),
          signals: ruleEvaluation.signals,
          aiScore: aiAnalysis?.result.riskScore,
          aiSummary: aiAnalysis?.result.summary,
          aiProvider: aiAnalysis?.provider.label,
          aiRaw: aiAnalysis?.result || null,
          actorUserId: input.actorUserId,
          req: input.req,
        })
      : Promise.resolve(null),
  ])

  return {
    ruleScore: ruleEvaluation.score,
    ruleSignals: ruleEvaluation.signals,
    ai: aiAnalysis?.result || null,
    user: results[0],
    company: results[1],
  }
}

export async function upsertFraudDeviceLog(params: {
  userId: string
  req: NextRequest | Request
  riskLevel?: FraudRiskLevel | null
}) {
  const ipAddress = getRequestIp(params.req)
  const userAgent = getRequestUserAgent(params.req)
  const deviceFingerprint = getDeviceFingerprint(params.req)

  await prisma.fraudDeviceLog.upsert({
    where: {
      userId_ipAddress: {
        userId: params.userId,
        ipAddress,
      },
    },
    create: {
      userId: params.userId,
      ipAddress,
      userAgent,
      deviceFingerprint: deviceFingerprint || null,
      lastSeenAt: new Date(),
      loginCount: 1,
      lastRiskLevel: params.riskLevel || null,
      isFlagged: RED_LINE_LEVELS.includes(params.riskLevel || FraudRiskLevel.SAFE),
    },
    update: {
      userAgent,
      deviceFingerprint: deviceFingerprint || null,
      lastSeenAt: new Date(),
      loginCount: { increment: 1 },
      lastRiskLevel: params.riskLevel || undefined,
      isFlagged: RED_LINE_LEVELS.includes(params.riskLevel || FraudRiskLevel.SAFE),
    },
  })
}

export async function assertFraudActionAllowed(params: {
  userId: string
  companyId?: string | null
  action: FraudAction
}) {
  const [user, company] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        fraudRiskLevel: true,
        fraudRestrictedActions: true,
      },
    }),
    params.companyId
      ? prisma.company.findUnique({
          where: { id: params.companyId },
          select: {
            fraudRiskLevel: true,
            fraudRestrictedActions: true,
          },
        })
      : Promise.resolve(null),
  ])

  const userRestrictions = parseRestrictedActions(user?.fraudRestrictedActions)
  const companyRestrictions = parseRestrictedActions(company?.fraudRestrictedActions)
  const userBlocked = user?.fraudRiskLevel === FraudRiskLevel.BLOCKED || userRestrictions.includes(params.action)
  const companyBlocked = company?.fraudRiskLevel === FraudRiskLevel.BLOCKED || companyRestrictions.includes(params.action)

  if (userBlocked || companyBlocked) {
    throw new ApiError(403, 'This action is temporarily restricted while your account is under fraud review.')
  }
}

export async function applyAdminFraudDecision(params: {
  adminUserId: string
  entityType: FraudEntityType
  userId?: string
  companyId?: string
  alertId?: string
  historyId?: string
  decision: FraudReviewDecision
  note?: string
  requestedDocuments?: string[]
}) {
  const level =
    params.decision === FraudReviewDecision.BLOCK
      ? FraudRiskLevel.BLOCKED
      : params.decision === FraudReviewDecision.RESTRICT
        ? FraudRiskLevel.HIGH
        : params.decision === FraudReviewDecision.REQUEST_DOCUMENTS
          ? FraudRiskLevel.MEDIUM
          : FraudRiskLevel.SAFE

  const publicFlag = publicFlagFromRisk(level)
  const restrictedActions = restrictionsForRisk(level)

  if (params.entityType === FraudEntityType.USER && params.userId) {
    await prisma.user.update({
      where: { id: params.userId },
      data: {
        fraudRiskScore: level === FraudRiskLevel.SAFE ? 10 : level === FraudRiskLevel.MEDIUM ? 45 : level === FraudRiskLevel.HIGH ? 65 : 100,
        fraudRiskLevel: level,
        fraudPublicFlag: publicFlag,
        fraudRestrictedActions: serializeRestrictedActions(restrictedActions),
        fraudNotes: params.note || null,
        fraudLastReviewedAt: new Date(),
      },
    })
  }

  if (params.entityType === FraudEntityType.COMPANY && params.companyId) {
    await prisma.company.update({
      where: { id: params.companyId },
      data: {
        fraudRiskScore: level === FraudRiskLevel.SAFE ? 10 : level === FraudRiskLevel.MEDIUM ? 45 : level === FraudRiskLevel.HIGH ? 65 : 100,
        fraudRiskLevel: level,
        fraudPublicFlag: publicFlag,
        fraudRestrictedActions: serializeRestrictedActions(restrictedActions),
        fraudNotes: params.note || null,
        fraudLastReviewedAt: new Date(),
      },
    })
  }

  const review = await prisma.fraudReview.create({
    data: {
      entityType: params.entityType,
      userId: params.userId || null,
      companyId: params.companyId || null,
      alertId: params.alertId || null,
      historyId: params.historyId || null,
      reviewedById: params.adminUserId,
      decision: params.decision,
      note: params.note || null,
      requestedDocuments: params.requestedDocuments?.length ? JSON.stringify(params.requestedDocuments) : null,
    },
  })

  const userIds = new Set<string>()
  if (params.userId) userIds.add(params.userId)
  if (params.companyId) {
    const companyUsers = await prisma.companyUser.findMany({
      where: { companyId: params.companyId },
      select: { userId: true },
    })
    for (const companyUser of companyUsers) userIds.add(companyUser.userId)
  }

  await Promise.all(Array.from(userIds).map((userId) =>
    createNotification({
      userId,
      type: NotificationType.ADMIN_ANNOUNCEMENT,
      title:
        params.decision === FraudReviewDecision.APPROVE || params.decision === FraudReviewDecision.CLEAR_RESTRICTIONS
          ? 'Verification review completed'
          : params.decision === FraudReviewDecision.REQUEST_DOCUMENTS
            ? 'Additional verification documents requested'
            : params.decision === FraudReviewDecision.BLOCK
              ? 'Account blocked after security review'
              : 'Marketplace access restricted',
      message:
        params.decision === FraudReviewDecision.APPROVE || params.decision === FraudReviewDecision.CLEAR_RESTRICTIONS
          ? 'Your account review was completed and normal marketplace access has been restored.'
          : params.decision === FraudReviewDecision.REQUEST_DOCUMENTS
            ? 'Please upload the requested documents so our team can finish your compliance and fraud review.'
            : params.decision === FraudReviewDecision.BLOCK
              ? 'Your account has been blocked after a manual fraud review.'
              : 'Some marketplace actions are restricted while your account remains under review.',
      data: {
        decision: params.decision,
        requestedDocuments: params.requestedDocuments,
      },
    })
  ))

  await createAuditLog({
    userId: params.adminUserId,
    action: params.decision === FraudReviewDecision.BLOCK ? 'SUSPEND' : 'UPDATE',
    module: 'fraud-center',
    targetType: params.entityType,
    targetId: params.userId || params.companyId || review.id,
    newData: JSON.stringify({
      decision: params.decision,
      note: params.note,
      requestedDocuments: params.requestedDocuments,
    }),
  })

  return review
}

export async function getFraudCenterDashboard() {
  const monitoredRoleFilter = {
    roles: {
      some: {
        role: {
          name: { in: [ROLES.BUYER, ROLES.SUPPLIER_OWNER, ROLES.SUPPLIER_STAFF] },
        },
      },
    },
    deletedAt: null,
  }

  const [
    totalUsers,
    userRiskStats,
    companyRiskStats,
    openAlerts,
    recentAlerts,
    recentHistory,
    deviceLogs,
  ] = await Promise.all([
    prisma.user.count({ where: monitoredRoleFilter }),
    prisma.user.groupBy({
      by: ['fraudRiskLevel'],
      where: monitoredRoleFilter,
      _count: { _all: true },
    }),
    prisma.company.groupBy({
      by: ['fraudRiskLevel'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.fraudAlert.count({ where: { status: { in: ['OPEN', 'INVESTIGATING', 'WATCHLIST'] } } }),
    prisma.fraudAlert.findMany({
      take: 12,
      orderBy: { createdAt: 'desc' },
      include: {
        reportedBy: { select: { firstName: true, lastName: true, email: true } },
        targetUser: { select: { id: true, firstName: true, lastName: true, email: true, fraudRiskLevel: true } },
        targetCompany: { select: { id: true, name: true, fraudRiskLevel: true, fraudPublicFlag: true } },
      },
    }),
    prisma.fraudRiskHistory.findMany({
      take: 18,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        company: { select: { name: true } },
      },
    }),
    prisma.fraudDeviceLog.findMany({
      take: 12,
      orderBy: { lastSeenAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, fraudRiskLevel: true } },
      },
    }),
  ])

  return {
    overview: {
      totalUsers,
      totalCompanies: companyRiskStats.reduce((sum, row) => sum + row._count._all, 0),
      openAlerts,
      userRiskStats,
      companyRiskStats,
    },
    recentAlerts,
    recentHistory,
    deviceLogs,
  }
}
