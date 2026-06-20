import { NextRequest } from 'next/server'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { getOAuthSettings } from '@/lib/auth/oauth'

export async function GET(_req: NextRequest) {
  try {
    const [google, facebook] = await Promise.all([
      getOAuthSettings('google'),
      getOAuthSettings('facebook'),
    ])

    return successResponse({
      google: {
        enabled: google.enabled && !!google.clientId && !!google.clientSecret,
      },
      facebook: {
        enabled: facebook.enabled && !!facebook.clientId && !!facebook.clientSecret,
      },
    }, 'Social providers fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
