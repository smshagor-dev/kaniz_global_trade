import { cookies } from 'next/headers'
import { getSettingsMap } from '@/lib/settings/system'
import { generateSecureToken, generateTokenPair } from '@/lib/auth/jwt'
import prisma from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/password'

const OAUTH_STATE_COOKIE = 'kgt_oauth_state'
const OAUTH_REDIRECT_COOKIE = 'kgt_oauth_redirect'

export type OAuthProvider = 'google' | 'facebook'

type ProviderSettings = {
  enabled: boolean
  clientId: string
  clientSecret: string
}

export async function getOAuthSettings(provider: OAuthProvider): Promise<ProviderSettings> {
  const keyPrefix = provider === 'google' ? 'GOOGLE' : 'FACEBOOK'
  const settings = await getSettingsMap([
    `${keyPrefix}_LOGIN_ENABLED`,
    `${keyPrefix}_CLIENT_ID`,
    `${keyPrefix}_CLIENT_SECRET`,
  ])

  return {
    enabled: settings[`${keyPrefix}_LOGIN_ENABLED`] === 'true',
    clientId: settings[`${keyPrefix}_CLIENT_ID`] || '',
    clientSecret: settings[`${keyPrefix}_CLIENT_SECRET`] || '',
  }
}

export function getOAuthCallbackUrl(provider: OAuthProvider) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${appUrl}/api/auth/oauth/${provider}/callback`
}

export async function setOAuthState(state: string, redirect?: string) {
  const cookieStore = await cookies()
  cookieStore.set(OAUTH_STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  cookieStore.set(OAUTH_REDIRECT_COOKIE, redirect || '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
}

export async function consumeOAuthState() {
  const cookieStore = await cookies()
  const state = cookieStore.get(OAUTH_STATE_COOKIE)?.value || ''
  const redirect = cookieStore.get(OAUTH_REDIRECT_COOKIE)?.value || ''
  cookieStore.delete(OAUTH_STATE_COOKIE)
  cookieStore.delete(OAUTH_REDIRECT_COOKIE)
  return { state, redirect }
}

export function buildAuthorizeUrl(provider: OAuthProvider, state: string) {
  const callbackUrl = getOAuthCallbackUrl(provider)

  if (provider === 'google') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', '')
    url.searchParams.set('redirect_uri', callbackUrl)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid email profile')
    url.searchParams.set('state', state)
    url.searchParams.set('prompt', 'select_account')
    return url
  }

  const url = new URL('https://www.facebook.com/v20.0/dialog/oauth')
  url.searchParams.set('client_id', '')
  url.searchParams.set('redirect_uri', callbackUrl)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'email,public_profile')
  return url
}

export async function exchangeGoogleCode(code: string, clientId: string, clientSecret: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getOAuthCallbackUrl('google'),
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) throw new Error('Google token exchange failed')
  return response.json() as Promise<{ access_token: string; id_token?: string }>
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (!response.ok) throw new Error('Google profile fetch failed')
  return response.json() as Promise<{
    id: string
    email: string
    given_name?: string
    family_name?: string
    name?: string
    picture?: string
    verified_email?: boolean
  }>
}

export async function exchangeFacebookCode(code: string, clientId: string, clientSecret: string) {
  const url = new URL('https://graph.facebook.com/v20.0/oauth/access_token')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('redirect_uri', getOAuthCallbackUrl('facebook'))
  url.searchParams.set('code', code)

  const response = await fetch(url.toString(), { cache: 'no-store' })
  if (!response.ok) throw new Error('Facebook token exchange failed')
  return response.json() as Promise<{ access_token: string }>
}

export async function fetchFacebookProfile(accessToken: string) {
  const url = new URL('https://graph.facebook.com/me')
  url.searchParams.set('fields', 'id,email,first_name,last_name,name,picture')
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString(), { cache: 'no-store' })
  if (!response.ok) throw new Error('Facebook profile fetch failed')
  return response.json() as Promise<{
    id: string
    email?: string
    first_name?: string
    last_name?: string
    name?: string
    picture?: { data?: { url?: string } }
  }>
}

export async function upsertOAuthUser(
  provider: OAuthProvider,
  profile: {
    providerId: string
    email: string
    firstName: string
    lastName: string
    avatar?: string | null
    emailVerified?: boolean
  },
  ipAddress?: string,
  userAgent?: string
) {
  const password = await hashPassword(generateSecureToken())
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: profile.email },
        provider === 'google' ? { googleId: profile.providerId } : { facebookId: profile.providerId },
      ],
      deletedAt: null,
    },
    include: { roles: { include: { role: true } } },
  })

  let user = existing

  if (!user) {
    const buyerRole = await prisma.role.findUnique({ where: { name: 'BUYER' } })
    if (!buyerRole) throw new Error('Buyer role not found')

    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: profile.email,
          password,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatar: profile.avatar || null,
          emailVerified: profile.emailVerified ? new Date() : null,
          status: 'ACTIVE',
          googleId: provider === 'google' ? profile.providerId : null,
          facebookId: provider === 'facebook' ? profile.providerId : null,
        },
        include: { roles: { include: { role: true } } },
      })

      await tx.userRole.create({
        data: {
          userId: created.id,
          roleId: buyerRole.id,
        },
      })

      await tx.notificationPreference.create({
        data: { userId: created.id },
      })

      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: { roles: { include: { role: true } } },
      })
    })
  } else {
    const currentUser = existing
    if (!currentUser) throw new Error('OAuth user lookup failed')
    user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        firstName: profile.firstName || currentUser.firstName,
        lastName: profile.lastName || currentUser.lastName,
        avatar: profile.avatar || currentUser.avatar,
        emailVerified: profile.emailVerified ? currentUser.emailVerified || new Date() : currentUser.emailVerified,
        status: currentUser.status === 'SUSPENDED' ? currentUser.status : 'ACTIVE',
        googleId: provider === 'google' ? profile.providerId : currentUser.googleId,
        facebookId: provider === 'facebook' ? profile.providerId : currentUser.facebookId,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress || currentUser.lastLoginIp,
      },
      include: { roles: { include: { role: true } } },
    })
  }

  const roles = user.roles.map((item) => item.role.name)
  const tokens = await generateTokenPair(
    { userId: user.id, email: user.email, roles },
    ipAddress,
    userAgent,
    { rememberMe: true }
  )

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
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
  }
}
