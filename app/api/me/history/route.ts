import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const searchEventSchema = z.object({
  type: z.literal('SEARCH'),
  query: z.string().trim().min(1).max(300),
  normalizedQuery: z.string().trim().max(300).optional(),
  scope: z.string().trim().min(1).max(50),
  mode: z.string().trim().max(50).optional(),
  resultsCount: z.number().int().min(0).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
})

const viewEventSchema = z.object({
  type: z.literal('VIEW'),
  entityType: z.enum(['PRODUCT', 'COMPANY']),
  entityId: z.string().trim().min(1),
  productId: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  title: z.string().trim().max(255).optional(),
  slug: z.string().trim().max(255).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const historyEventSchema = z.discriminatedUnion('type', [
  searchEventSchema,
  viewEventSchema,
])

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const limit = Math.max(1, Math.min(20, Number(searchParams.get('limit') || '10')))

    const [searches, views] = await Promise.all([
      prisma.userSearchHistory.findMany({
        where: { userId: authUser.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.userViewHistory.findMany({
        where: { userId: authUser.userId },
        orderBy: { lastViewedAt: 'desc' },
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: { where: { isPrimary: true }, take: 1, select: { url: true, alt: true } },
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
        },
      }),
    ])

    return successResponse({ searches, views }, 'User history fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const event = historyEventSchema.parse(await req.json())

    if (event.type === 'SEARCH') {
      const created = await prisma.userSearchHistory.create({
        data: {
          userId: authUser.userId,
          query: event.query,
          normalizedQuery: event.normalizedQuery,
          scope: event.scope,
          mode: event.mode,
          resultsCount: event.resultsCount,
          filters: event.filters ? JSON.stringify(event.filters) : null,
        },
      })

      return successResponse(created, 'Search history tracked', undefined, 201)
    }

    if (event.entityType === 'PRODUCT' && !event.productId) {
      throw new ApiError(422, 'productId is required for PRODUCT view tracking')
    }

    if (event.entityType === 'COMPANY' && !event.companyId) {
      throw new ApiError(422, 'companyId is required for COMPANY view tracking')
    }

    const upserted = await prisma.userViewHistory.upsert({
      where: {
        userId_entityType_entityId: {
          userId: authUser.userId,
          entityType: event.entityType,
          entityId: event.entityId,
        },
      },
      update: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
        title: event.title,
        slug: event.slug,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      },
      create: {
        userId: authUser.userId,
        entityType: event.entityType,
        entityId: event.entityId,
        productId: event.productId,
        companyId: event.companyId,
        title: event.title,
        slug: event.slug,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      },
    })

    return successResponse(upserted, 'View history tracked', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
