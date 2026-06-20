import { NextRequest, NextResponse } from 'next/server'
import {
  consumeOAuthState,
  exchangeFacebookCode,
  exchangeGoogleCode,
  fetchFacebookProfile,
  fetchGoogleProfile,
  getOAuthSettings,
  upsertOAuthUser,
  type OAuthProvider,
} from '@/lib/auth/oauth'

function redirectWithError(provider: string, message: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.redirect(`${appUrl}/auth/social?provider=${provider}&error=${encodeURIComponent(message)}`)
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await context.params
    if (provider !== 'google' && provider !== 'facebook') {
      return redirectWithError(provider, 'Unsupported provider')
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const providerType = provider as OAuthProvider

    if (!code || !state) {
      return redirectWithError(provider, 'Missing OAuth code or state')
    }

    const stored = await consumeOAuthState()
    if (!stored.state || stored.state !== state) {
      return redirectWithError(provider, 'OAuth state mismatch')
    }

    const settings = await getOAuthSettings(providerType)
    if (!settings.enabled || !settings.clientId || !settings.clientSecret) {
      return redirectWithError(provider, `${provider} login is not configured`)
    }

    const forwardedFor = req.headers.get('x-forwarded-for')
    const ip = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    const ua = req.headers.get('user-agent') || ''

    const authResult = providerType === 'google'
      ? await (async () => {
          const token = await exchangeGoogleCode(code, settings.clientId, settings.clientSecret)
          const profile = await fetchGoogleProfile(token.access_token)
          if (!profile.email) throw new Error('Google account email is required')
          return upsertOAuthUser('google', {
            providerId: profile.id,
            email: profile.email,
            firstName: profile.given_name || profile.name?.split(' ')[0] || 'Google',
            lastName: profile.family_name || profile.name?.split(' ').slice(1).join(' ') || 'User',
            avatar: profile.picture || null,
            emailVerified: !!profile.verified_email,
          }, ip, ua)
        })()
      : await (async () => {
          const token = await exchangeFacebookCode(code, settings.clientId, settings.clientSecret)
          const profile = await fetchFacebookProfile(token.access_token)
          if (!profile.email) throw new Error('Facebook account email is required')
          return upsertOAuthUser('facebook', {
            providerId: profile.id,
            email: profile.email,
            firstName: profile.first_name || profile.name?.split(' ')[0] || 'Facebook',
            lastName: profile.last_name || profile.name?.split(' ').slice(1).join(' ') || 'User',
            avatar: profile.picture?.data?.url || null,
            emailVerified: true,
          }, ip, ua)
        })()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirect = stored.redirect || ''
    const target = new URL(`${appUrl}/auth/social`)
    if (redirect) target.searchParams.set('redirect', redirect)
    target.hash = new URLSearchParams({
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
      user: encodeURIComponent(JSON.stringify(authResult.user)),
    }).toString()

    return NextResponse.redirect(target)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth login failed'
    return redirectWithError('oauth', message)
  }
}
