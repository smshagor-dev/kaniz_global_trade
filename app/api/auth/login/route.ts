import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { hashPassword, needsPasswordRehash, verifyPassword } from '@/lib/auth/password'
import { generateTokenPair } from '@/lib/auth/jwt'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { checkRateLimit, resetRateLimit } from '@/lib/db/redis'
import { logLogin } from '@/lib/utils/audit'
import { logAuthFailureEvent } from '@/lib/monitoring/event-helpers'
import { FraudEventType, FraudRiskLevel } from '@prisma/client'
import { screenFraudEvent, upsertFraudDeviceLog } from '@/lib/fraud/service'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().optional(),
  rememberMe: z.boolean().optional().default(true),
})

export async function POST(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get('x-forwarded-for')
    const ip = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    const ua = req.headers.get('user-agent') || ''
    const body = await req.json()
    const data = loginSchema.parse(body)
    const loginRateLimitKey = `login:${ip}:${data.email.toLowerCase()}`

    const { allowed } = await checkRateLimit(loginRateLimitKey, 10, 900)
    if (!allowed) {
      await logAuthFailureEvent({
        message: 'Login blocked by rate limit.',
        ipAddress: ip,
        email: data.email,
        reason: 'rate_limit',
      })
      return errorResponse('Too many login attempts. Try again in 15 minutes.', 429)
    }

    const user = await prisma.user.findUnique({
      where: { email: data.email, deletedAt: null },
      include: {
        roles: { include: { role: true } },
        twoFactorSecret: true,
      },
    })

    if (!user || !(await verifyPassword(user.password, data.password))) {
      await logAuthFailureEvent({
        message: 'Login failed due to invalid credentials.',
        ipAddress: ip,
        email: data.email,
        reason: 'invalid_credentials',
      })
      return errorResponse('Invalid email or password', 401)
    }

    if (needsPasswordRehash(user.password)) {
      const passwordHash = await hashPassword(data.password)
      await prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash },
      })
      user.password = passwordHash
    }

    if (user.status === 'SUSPENDED') {
      await logAuthFailureEvent({
        message: 'Login blocked because the account is suspended.',
        ipAddress: ip,
        email: data.email,
        reason: 'suspended',
      })
      return errorResponse('Your account has been suspended. Contact support.', 403)
    }

    if (user.fraudRiskLevel === FraudRiskLevel.BLOCKED) {
      await logAuthFailureEvent({
        message: 'Login blocked because the account is under security review.',
        ipAddress: ip,
        email: data.email,
        reason: 'fraud_blocked',
      })
      return errorResponse('Your account is blocked pending a security review.', 403)
    }

    // 2FA check
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!data.twoFactorCode) {
        return successResponse(
          { requiresTwoFactor: true },
          'Two-factor authentication required'
        )
      }

      const OTPAuth = await import('otpauth')
      const totp = new OTPAuth.TOTP({
        secret: user.twoFactorSecret.secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      })

      if (!totp.validate({ token: data.twoFactorCode, window: 1 })) {
        await logAuthFailureEvent({
          message: 'Login failed due to invalid two-factor code.',
          ipAddress: ip,
          email: data.email,
          reason: 'invalid_2fa',
        })
        return errorResponse('Invalid two-factor code', 401)
      }
    }

    const roles = user.roles.map((ur) => ur.role.name)
    const { accessToken, refreshToken } = await generateTokenPair(
      { userId: user.id, email: user.email, roles },
      ip,
      ua,
      { rememberMe: data.rememberMe }
    )

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        status: user.status === 'PENDING_VERIFICATION' ? user.status : 'ACTIVE',
      },
    })

    const fraudResult = await screenFraudEvent({
      req,
      actorUserId: user.id,
      userId: user.id,
      eventType: FraudEventType.LOGIN,
      sourceModule: 'auth/login',
      title: 'Marketplace login',
      summary: 'Buyer or supplier login completed.',
      payload: {
        email: data.email,
        rememberMe: data.rememberMe,
      },
    })

    await upsertFraudDeviceLog({
      userId: user.id,
      req,
      riskLevel: fraudResult.user?.level,
    })

    await logLogin(user.id, ip, ua)
    await resetRateLimit(loginRateLimitKey)

    return successResponse({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        roles,
        emailVerified: user.emailVerified,
        status: user.status,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
