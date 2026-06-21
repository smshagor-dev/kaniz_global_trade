import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { AD_PLACEMENTS, getAdvertisingSettings } from '@/lib/advertising/settings'

const createSchema = z.object({
  productId: z.string().optional(),
  title: z.string().min(3),
  placement: z.enum(AD_PLACEMENTS),
  budget: z.number().positive(),
  bidAmount: z.number().nonnegative().default(0),
  targetKeyword: z.string().optional(),
  creativeUrl: z.string().url().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const where: Record<string, unknown> = {}
    if (authUser.companyId && !authUser.roles.includes(ROLES.ADMIN) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      where.companyId = authUser.companyId
    }

    const campaigns = await prisma.adCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    })

    return successResponse(campaigns, 'Ad campaigns fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (!authUser.companyId) throw new ApiError(403, 'Supplier company required')
    const advertisingSettings = await getAdvertisingSettings()
    if (!advertisingSettings.enabled) throw new ApiError(403, 'Advertising is currently disabled by admin')
    const data = createSchema.parse(await req.json())

    if (advertisingSettings.requireProductLink && !data.productId) {
      throw new ApiError(422, 'A linked product is required for advertising campaigns')
    }

    if (!advertisingSettings.allowedPlacements.includes(data.placement)) {
      throw new ApiError(422, 'This advertising placement is currently unavailable')
    }

    if (data.budget < advertisingSettings.minBudget || data.budget > advertisingSettings.maxBudget) {
      throw new ApiError(422, `Budget must be between ${advertisingSettings.minBudget} and ${advertisingSettings.maxBudget}`)
    }

    if (data.bidAmount < advertisingSettings.minBid || data.bidAmount > advertisingSettings.maxBid) {
      throw new ApiError(422, `Bid amount must be between ${advertisingSettings.minBid} and ${advertisingSettings.maxBid}`)
    }

    if (data.productId) {
      const product = await prisma.product.findFirst({
        where: {
          id: data.productId,
          companyId: authUser.companyId,
          deletedAt: null,
        },
        select: { id: true },
      })
      if (!product) throw new ApiError(404, 'Linked product not found for this supplier')
    }

    const startsAt = new Date(data.startsAt)
    const endsAt = new Date(data.endsAt)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new ApiError(422, 'Valid campaign dates are required')
    }
    if (endsAt <= startsAt) {
      throw new ApiError(422, 'Campaign end date must be after the start date')
    }

    const campaign = await prisma.adCampaign.create({
      data: {
        companyId: authUser.companyId,
        productId: data.productId,
        title: data.title,
        placement: data.placement,
        budget: data.budget,
        bidAmount: data.bidAmount,
        targetKeyword: data.targetKeyword,
        creativeUrl: data.creativeUrl,
        startsAt,
        endsAt,
        status: advertisingSettings.autoApprove ? 'ACTIVE' : 'PENDING_APPROVAL',
        approvedAt: advertisingSettings.autoApprove ? new Date() : null,
        approvedBy: advertisingSettings.autoApprove ? authUser.userId : null,
      },
    })

    return successResponse(campaign, advertisingSettings.autoApprove ? 'Ad campaign created and activated' : 'Ad campaign submitted', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
