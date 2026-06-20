import { NextRequest, NextResponse } from 'next/server'
import { buildAuthorizeUrl, getOAuthSettings, setOAuthState, type OAuthProvider } from '@/lib/auth/oauth'

function redirectWithError(provider: string, message: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.redirect(`${appUrl}/auth/login?social=${provider}&error=${encodeURIComponent(message)}`)
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await context.params
    if (provider !== 'google' && provider !== 'facebook') {
      return redirectWithError(provider, 'Unsupported OAuth provider')
    }

    const settings = await getOAuthSettings(provider as OAuthProvider)
    if (!settings.enabled || !settings.clientId || !settings.clientSecret) {
      return redirectWithError(provider, `${provider} login is not configured`)
    }

    const state = crypto.randomUUID()
    const redirect = new URL(req.url).searchParams.get('redirect') || ''
    await setOAuthState(state, redirect)

    const authorizeUrl = buildAuthorizeUrl(provider as OAuthProvider, state)
    authorizeUrl.searchParams.set('client_id', settings.clientId)

    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth start failed'
    return redirectWithError('oauth', message)
  }
}
