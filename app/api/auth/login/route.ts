import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { hashPassword, needsPasswordRehash, verifyPassword } from '@/lib/auth/password'
import { generateTokenPair } from '@/lib/auth/jwt'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { checkRateLimit } from '@/lib/db/redis'
import { logLogin } from '@/lib/utils/audit'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const ua = req.headers.get('user-agent') || ''

    const { allowed } = await checkRateLimit(`login:${ip}`, 10, 900)
    if (!allowed) return errorResponse('Too many login attempts. Try again in 15 minutes.', 429)

    const body = await req.json()
    const data = loginSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: data.email, deletedAt: null },
      include: {
        roles: { include: { role: true } },
        twoFactorSecret: true,
      },
    })

    if (!user || !(await verifyPassword(user.password, data.password))) {
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
      return errorResponse('Your account has been suspended. Contact support.', 403)
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
        return errorResponse('Invalid two-factor code', 401)
      }
    }

    const roles = user.roles.map((ur) => ur.role.name)
    const { accessToken, refreshToken } = await generateTokenPair(
      { userId: user.id, email: user.email, roles },
      ip,
      ua
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

    await logLogin(user.id, ip, ua)

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
