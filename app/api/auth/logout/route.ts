import { NextRequest } from 'next/server'
import { z } from 'zod'
import { revokeRefreshToken } from '@/lib/auth/jwt'
import { successResponse, handleApiError } from '@/lib/utils/api'
import { getAuthUser } from '@/lib/permissions'
import { logLogout } from '@/lib/utils/audit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(body)

    const user = await getAuthUser(req)
    if (user) await logLogout(user.userId, req.headers.get('x-forwarded-for') || undefined)

    if (refreshToken) await revokeRefreshToken(refreshToken)

    return successResponse(null, 'Logged out successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
