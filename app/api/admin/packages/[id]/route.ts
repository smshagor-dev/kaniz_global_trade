import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { slugify } from '@/lib/utils/slug'

const updatePackageSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional().or(z.literal('')).nullable(),
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
  stripePriceIdMonthly: z.string().max(191).optional().or(z.literal('')).nullable(),
  stripePriceIdYearly: z.string().max(191).optional().or(z.literal('')).nullable(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req)
    const { id } = await params
    const data = updatePackageSchema.parse(await req.json())

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Package not found')

    const requestedSlug = slugify(data.slug || data.name)
    if (requestedSlug !== existing.slug) {
      const slugExists = await prisma.subscriptionPlan.findFirst({
        where: {
          slug: requestedSlug,
          id: { not: id },
        },
        select: { id: true },
      })
      if (slugExists) throw new ApiError(409, 'Package slug already in use')
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.subscriptionPlan.updateMany({
          where: {
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        })
      }

      return tx.subscriptionPlan.update({
        where: { id },
        data: {
          ...data,
          slug: requestedSlug,
          description: data.description || null,
          stripePriceIdMonthly: data.stripePriceIdMonthly || null,
          stripePriceIdYearly: data.stripePriceIdYearly || null,
        },
      })
    })

    return successResponse(updated, 'Package updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
