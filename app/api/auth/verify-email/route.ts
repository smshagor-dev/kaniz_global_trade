import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'

export async function POST(req: NextRequest) {
  try {
    const { token } = z.object({ token: z.string() }).parse(await req.json())

    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!record) return errorResponse('Invalid or expired verification token', 400)
    if (record.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { id: record.id } })
      return errorResponse('Verification token expired', 400)
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          emailVerified: new Date(),
          status: 'ACTIVE',
        },
      }),
      prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ])

    return successResponse(null, 'Email verified successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
