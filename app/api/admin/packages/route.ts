import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { uniqueSlug } from '@/lib/utils/slug'

const packageSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional().or(z.literal('')),
  monthlyPrice: z.coerce.number().min(0),
  yearlyPrice: z.coerce.number().min(0),
  trialDays: z.coerce.number().int().min(0).max(365).default(0),
  maxProducts: z.coerce.number().int().min(1),
  maxStaff: z.coerce.number().int().min(1),
  maxImages: z.coerce.number().int().min(1),
  featuredProducts: z.boolean().default(false),
  featuredCompany: z.boolean().default(false),
  verificationBadge: z.boolean().default(false),
  analytics: z.boolean().default(false),
  priorityRanking: z.boolean().default(false),
  apiAccess: z.boolean().default(false),
  dedicatedSupport: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  stripePriceIdMonthly: z.string().max(191).optional().or(z.literal('')),
  stripePriceIdYearly: z.string().max(191).optional().or(z.literal('')),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const packages = await prisma.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
        subscriptions: {
          select: { status: true },
        },
      },
    })

    return successResponse(
      packages.map((item) => ({
        ...item,
        activeSubscriptions: item.subscriptions.filter((sub) => ['ACTIVE', 'TRIAL'].includes(sub.status)).length,
      }))
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const data = packageSchema.parse(await req.json())

    const slug = await uniqueSlug(data.slug || data.name, async (candidate) => {
      const existing = await prisma.subscriptionPlan.findUnique({ where: { slug: candidate }, select: { id: true } })
      return !!existing
    })

    const created = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.subscriptionPlan.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        })
      }

      return tx.subscriptionPlan.create({
        data: {
          ...data,
          slug,
          description: data.description || null,
          stripePriceIdMonthly: data.stripePriceIdMonthly || null,
          stripePriceIdYearly: data.stripePriceIdYearly || null,
        },
      })
    })

    return successResponse(created, 'Package created successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
