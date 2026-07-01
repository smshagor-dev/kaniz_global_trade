import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/password'
import { generateTokenPair } from '@/lib/auth/jwt'
import { generateSecureToken } from '@/lib/auth/jwt'
import { sendVerificationEmail } from '@/lib/email'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { checkRateLimit } from '@/lib/db/redis'
import { createAuditLog } from '@/lib/utils/audit'
import { uniqueSlug } from '@/lib/utils/slug'
import { isFreePlan } from '@/lib/packages'

const registerSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
  phone: z.string().optional(),
  companyName: z.string().min(2).max(200).optional(),
  packageSlug: z.string().min(2).max(100).optional(),
  role: z.enum(['BUYER', 'SUPPLIER_OWNER']).default('BUYER'),
}).superRefine((data, ctx) => {
  if (data.role === 'SUPPLIER_OWNER' && !data.companyName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['companyName'],
      message: 'Company name is required for suppliers',
    })
  }
})

export async function POST(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get('x-forwarded-for')
    const ip = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    const ua = req.headers.get('user-agent') || ''
    const { allowed } = await checkRateLimit(`register:${ip}`, 5, 3600)
    if (!allowed) return errorResponse('Too many registration attempts. Try again later.', 429)

    const body = await req.json()
    const data = registerSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) return errorResponse('Email already registered', 409)

    const passwordHash = await hashPassword(data.password)

    const role = await prisma.role.findUnique({ where: { name: data.role } })
    if (!role) return errorResponse('Invalid role', 400)

    const selectedPackage = data.role === 'SUPPLIER_OWNER' && data.packageSlug
      ? await prisma.subscriptionPlan.findFirst({
          where: { slug: data.packageSlug, isActive: true },
        })
      : null
    const defaultPackage = data.role === 'SUPPLIER_OWNER'
      ? await prisma.subscriptionPlan.findFirst({
          where: { isDefault: true, isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        })
      : null

    const onboardingPackage = selectedPackage || defaultPackage
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: passwordHash,
          phone: data.phone,
          status: 'PENDING_VERIFICATION',
        },
      })

      await tx.userRole.create({
        data: { userId: newUser.id, roleId: role.id },
      })

      // Create notification preferences
      await tx.notificationPreference.create({
        data: { userId: newUser.id },
      })

      let companyId: string | null = null
      let nextPackageSlug: string | null = null
      let packageStatus: 'ACTIVE' | 'PAYMENT_REQUIRED' | 'SELECTION_REQUIRED' = 'ACTIVE'

      if (data.role === 'SUPPLIER_OWNER' && data.companyName) {
        const companySlug = await uniqueSlug(data.companyName, async (candidate) => {
          const existingCompany = await tx.company.findUnique({ where: { slug: candidate }, select: { id: true } })
          return !!existingCompany
        })

        const company = await tx.company.create({
          data: {
            name: data.companyName,
            legalName: data.companyName,
            slug: companySlug,
            businessType: 'MANUFACTURER',
            email: data.email,
            phone: data.phone,
            status: 'ACTIVE',
          },
        })

        companyId = company.id

        await tx.companyUser.create({
          data: {
            companyId: company.id,
            userId: newUser.id,
            isPrimary: true,
          },
        })

        await tx.companyVerification.create({
          data: {
            companyId: company.id,
            status: 'UNVERIFIED',
          },
        })

        if (onboardingPackage) {
          nextPackageSlug = onboardingPackage.slug

          if (isFreePlan(onboardingPackage, 'MONTHLY')) {
            const now = new Date()
            const trialEndsAt = onboardingPackage.trialDays > 0
              ? new Date(now.getTime() + onboardingPackage.trialDays * 24 * 60 * 60 * 1000)
              : null
            const currentPeriodEnd = trialEndsAt || new Date(now.getFullYear() + 10, 11, 31)

            await tx.subscription.upsert({
              where: { companyId: company.id },
              create: {
                companyId: company.id,
                planId: onboardingPackage.id,
                status: trialEndsAt ? 'TRIAL' : 'ACTIVE',
                billingCycle: 'MONTHLY',
                currentPeriodStart: now,
                currentPeriodEnd,
                trialEndsAt,
              },
              update: {
                planId: onboardingPackage.id,
                status: trialEndsAt ? 'TRIAL' : 'ACTIVE',
                billingCycle: 'MONTHLY',
                currentPeriodStart: now,
                currentPeriodEnd,
                trialEndsAt,
                cancelledAt: null,
              },
            })
          } else {
            packageStatus = 'PAYMENT_REQUIRED'
          }
        } else {
          packageStatus = 'SELECTION_REQUIRED'
        }
      }

      return {
        ...newUser,
        companyId,
        packageStatus,
        nextPackageSlug,
      }
    })

    // Send verification email
    const token = generateSecureToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt },
    })

    void sendVerificationEmail(user.email, user.firstName, token).catch((emailError) => {
      console.error('Verification email dispatch failed:', emailError)
    })

    const roles = [role.name]
    const { accessToken, refreshToken } = await generateTokenPair(
      { userId: user.id, email: user.email, roles },
      ip,
      ua,
      { rememberMe: true }
    )

    await createAuditLog({
      userId: user.id,
      action: 'CREATE',
      module: 'auth',
      targetType: 'User',
      targetId: user.id,
      ipAddress: ip,
    })

    return successResponse(
      {
        userId: user.id,
        email: user.email,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles,
          emailVerified: user.emailVerified,
          status: user.status,
        },
        redirectTo:
          data.role === 'SUPPLIER_OWNER'
            ? user.packageStatus === 'ACTIVE'
              ? '/dashboard/overview'
              : `/dashboard/packages?onboarding=1${user.nextPackageSlug ? `&plan=${encodeURIComponent(user.nextPackageSlug)}` : ''}`
            : '/buyer',
      },
      'Registration successful. Please verify your email.',
      undefined,
      201
    )
  } catch (error) {
    return handleApiError(error)
  }
}
