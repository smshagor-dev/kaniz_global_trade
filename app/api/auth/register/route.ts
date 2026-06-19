import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/password'
import { generateTokenPair } from '@/lib/auth/jwt'
import { generateSecureToken } from '@/lib/auth/jwt'
import { sendVerificationEmail } from '@/lib/email'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { checkRateLimit } from '@/lib/db/redis'
import { createAuditLog } from '@/lib/utils/audit'

const registerSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
  phone: z.string().optional(),
  role: z.enum(['BUYER', 'SUPPLIER_OWNER']).default('BUYER'),
})

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed } = await checkRateLimit(`register:${ip}`, 5, 3600)
    if (!allowed) return errorResponse('Too many registration attempts. Try again later.', 429)

    const body = await req.json()
    const data = registerSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) return errorResponse('Email already registered', 409)

    const passwordHash = await hashPassword(data.password)

    const role = await prisma.role.findUnique({ where: { name: data.role } })
    if (!role) return errorResponse('Invalid role', 400)

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: passwordHash,
          phone: data.phone,
          status: 'PENDING_VERIFICATION',
        },
      })

      await tx.userRole.create({
        data: { userId: newUser.id, roleId: role.id },
      })

      // Create notification preferences
      await tx.notificationPreference.create({
        data: { userId: newUser.id },
      })

      return newUser
    })

    // Send verification email
    const token = generateSecureToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt },
    })

    await sendVerificationEmail(user.email, user.firstName, token)

    await createAuditLog({
      userId: user.id,
      action: 'CREATE',
      module: 'auth',
      targetType: 'User',
      targetId: user.id,
      ipAddress: ip,
    })

    return successResponse(
      { userId: user.id, email: user.email },
      'Registration successful. Please verify your email.',
      undefined,
      201
    )
  } catch (error) {
    return handleApiError(error)
  }
}
