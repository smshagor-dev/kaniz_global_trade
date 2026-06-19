import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { generateSecureToken } from '@/lib/auth/jwt'
import { sendPasswordResetEmail } from '@/lib/email'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { checkRateLimit } from '@/lib/db/redis'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed } = await checkRateLimit(`forgot:${ip}`, 3, 3600)
    if (!allowed) return errorResponse('Too many requests. Try again later.', 429)

    const { email } = z.object({ email: z.string().email() }).parse(await req.json())

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    })

    // Always return success to prevent user enumeration
    if (!user) return successResponse(null, 'If the email exists, a reset link has been sent.')

    // Invalidate existing tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

    const token = generateSecureToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    })

    await sendPasswordResetEmail(user.email, user.firstName, token)

    return successResponse(null, 'If the email exists, a reset link has been sent.')
  } catch (error) {
    return handleApiError(error)
  }
}
