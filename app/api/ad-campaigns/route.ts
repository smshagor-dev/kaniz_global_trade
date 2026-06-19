import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const createSchema = z.object({
  productId: z.string().optional(),
  title: z.string().min(3),
  placement: z.enum(['SEARCH_TOP', 'HOMEPAGE_HERO', 'HOMEPAGE_FEATURED', 'CATEGORY_SPOTLIGHT']),
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
    const data = createSchema.parse(await req.json())

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
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        status: 'PENDING_APPROVAL',
      },
    })

    return successResponse(campaign, 'Ad campaign submitted', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
