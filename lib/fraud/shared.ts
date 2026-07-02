import type { NextRequest } from 'next/server'
import { FraudPublicFlag, FraudRiskLevel } from '@prisma/client'

export const RED_LINE_LEVELS: FraudRiskLevel[] = [
  FraudRiskLevel.HIGH,
  FraudRiskLevel.CRITICAL,
  FraudRiskLevel.BLOCKED,
]

export const FRAUD_ACTIONS = {
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  RFQ_CREATE: 'RFQ_CREATE',
  QUOTATION_CREATE: 'QUOTATION_CREATE',
  ORDER_CREATE: 'ORDER_CREATE',
  MESSAGE_SEND: 'MESSAGE_SEND',
  PAYMENT_ACTIVITY: 'PAYMENT_ACTIVITY',
  PROFILE_UPDATE: 'PROFILE_UPDATE',
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  LOGIN: 'LOGIN',
  REGISTRATION: 'REGISTRATION',
  INQUIRY_CREATE: 'INQUIRY_CREATE',
  COMPANY_CREATE: 'COMPANY_CREATE',
  COMPANY_UPDATE: 'COMPANY_UPDATE',
  KYC_SUBMISSION: 'KYC_SUBMISSION',
} as const

export type FraudAction = typeof FRAUD_ACTIONS[keyof typeof FRAUD_ACTIONS]

export function clampRiskScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function riskLevelFromScore(score: number): FraudRiskLevel {
  if (score >= 95) return FraudRiskLevel.BLOCKED
  if (score >= 75) return FraudRiskLevel.CRITICAL
  if (score >= 55) return FraudRiskLevel.HIGH
  if (score >= 35) return FraudRiskLevel.MEDIUM
  if (score >= 15) return FraudRiskLevel.LOW
  return FraudRiskLevel.SAFE
}

export function publicFlagFromRisk(level: FraudRiskLevel): FraudPublicFlag {
  switch (level) {
    case FraudRiskLevel.BLOCKED:
      return FraudPublicFlag.BLOCKED
    case FraudRiskLevel.CRITICAL:
      return FraudPublicFlag.HIGH_RISK
    case FraudRiskLevel.HIGH:
      return FraudPublicFlag.LIMITED_ACCESS
    case FraudRiskLevel.MEDIUM:
      return FraudPublicFlag.UNDER_REVIEW
    default:
      return FraudPublicFlag.VERIFIED
  }
}

export function restrictionsForRisk(level: FraudRiskLevel): FraudAction[] {
  switch (level) {
    case FraudRiskLevel.BLOCKED:
      return Object.values(FRAUD_ACTIONS)
    case FraudRiskLevel.CRITICAL:
      return [
        FRAUD_ACTIONS.PRODUCT_CREATE,
        FRAUD_ACTIONS.RFQ_CREATE,
        FRAUD_ACTIONS.QUOTATION_CREATE,
        FRAUD_ACTIONS.ORDER_CREATE,
        FRAUD_ACTIONS.MESSAGE_SEND,
        FRAUD_ACTIONS.PAYMENT_ACTIVITY,
        FRAUD_ACTIONS.COMPANY_CREATE,
        FRAUD_ACTIONS.COMPANY_UPDATE,
      ]
    case FraudRiskLevel.HIGH:
      return [
        FRAUD_ACTIONS.PRODUCT_CREATE,
        FRAUD_ACTIONS.RFQ_CREATE,
        FRAUD_ACTIONS.QUOTATION_CREATE,
        FRAUD_ACTIONS.ORDER_CREATE,
        FRAUD_ACTIONS.MESSAGE_SEND,
      ]
    case FraudRiskLevel.MEDIUM:
      return [FRAUD_ACTIONS.PRODUCT_CREATE]
    default:
      return []
  }
}

export function parseRestrictedActions(raw?: string | null): FraudAction[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is FraudAction => typeof item === 'string')
  } catch {
    return []
  }
}

export function serializeRestrictedActions(actions: FraudAction[]) {
  return JSON.stringify(Array.from(new Set(actions)))
}

export function getRequestIp(req: NextRequest | Request) {
  const forwardedFor = req.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

export function getRequestUserAgent(req: NextRequest | Request) {
  return req.headers.get('user-agent') || ''
}

export function getDeviceFingerprint(req: NextRequest | Request) {
  return req.headers.get('x-device-id') || req.headers.get('sec-ch-ua') || null
}

export function formatPublicTrustLabel(flag?: FraudPublicFlag | null) {
  if (!flag) return null
  switch (flag) {
    case FraudPublicFlag.VERIFIED:
      return 'Verified'
    case FraudPublicFlag.UNDER_REVIEW:
      return 'Under Review'
    case FraudPublicFlag.LIMITED_ACCESS:
      return 'Limited Access'
    case FraudPublicFlag.HIGH_RISK:
      return 'High Risk'
    case FraudPublicFlag.BLOCKED:
      return 'Blocked'
  }
}
