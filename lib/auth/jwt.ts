import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../db/prisma'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m'
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d'
const REFRESH_REMEMBER_EXPIRES_DAYS = parseInt(process.env.JWT_REFRESH_REMEMBER_DAYS || '30')
const REFRESH_SESSION_EXPIRES_DAYS = parseInt(process.env.JWT_REFRESH_SESSION_DAYS || '1')

export interface JWTPayload {
  userId: string
  email: string
  roles: string[]
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
    jwtid: uuidv4(),
  } as jwt.SignOptions)
}

export function signRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
    jwtid: uuidv4(),
  } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, ACCESS_SECRET) as JWTPayload
}

export function verifyRefreshToken(token: string): JWTPayload {
  return jwt.verify(token, REFRESH_SECRET) as JWTPayload
}

export async function generateTokenPair(
  payload: JWTPayload,
  ipAddress?: string,
  userAgent?: string,
  options?: { rememberMe?: boolean }
): Promise<TokenPair> {
  const accessToken = signAccessToken(payload)
  const refreshToken = generateSecureToken()

  const expiresAt = new Date()
  expiresAt.setDate(
    expiresAt.getDate() + (options?.rememberMe ? REFRESH_REMEMBER_EXPIRES_DAYS : REFRESH_SESSION_EXPIRES_DAYS)
  )

  await prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      token: refreshToken,
      expiresAt,
      ipAddress,
      userAgent,
    },
  })

  return { accessToken, refreshToken }
}

export async function rotateRefreshToken(
  oldToken: string,
  ipAddress?: string,
  userAgent?: string,
  options?: { rememberMe?: boolean }
): Promise<TokenPair> {
  const existing = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { user: { include: { roles: { include: { role: true } } } } },
  })

  if (!existing) throw new Error('Invalid refresh token')
  if (existing.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: existing.id } })
    throw new Error('Refresh token expired')
  }

  await prisma.refreshToken.delete({ where: { id: existing.id } })

  const roles = existing.user.roles.map((ur) => ur.role.name)
  const payload: JWTPayload = {
    userId: existing.userId,
    email: existing.user.email,
    roles,
  }

  return generateTokenPair(payload, ipAddress, userAgent, options)
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } })
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } })
}

export function generateSecureToken(): string {
  return uuidv4() + uuidv4()
}
