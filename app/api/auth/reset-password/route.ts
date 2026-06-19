import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/password'
import { revokeAllUserTokens } from '@/lib/auth/jwt'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'

const schema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
})

export async function POST(req: NextRequest) {
  try {
    const { token, password } = schema.parse(await req.json())

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!record || record.used) return errorResponse('Invalid or used reset token', 400)
    if (record.expiresAt < new Date()) return errorResponse('Reset token has expired', 400)

    const passwordHash = await hashPassword(password)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
    ])

    await revokeAllUserTokens(record.userId)

    return successResponse(null, 'Password reset successfully. Please login.')
  } catch (error) {
    return handleApiError(error)
  }
}
