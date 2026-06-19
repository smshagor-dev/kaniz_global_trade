import { NextRequest } from 'next/server'
import { z } from 'zod'
import { rotateRefreshToken } from '@/lib/auth/jwt'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(body)

    const ip = req.headers.get('x-forwarded-for') || undefined
    const ua = req.headers.get('user-agent') || undefined

    const tokens = await rotateRefreshToken(refreshToken, ip, ua)
    return successResponse(tokens)
  } catch (error) {
    return handleApiError(error)
  }
}
