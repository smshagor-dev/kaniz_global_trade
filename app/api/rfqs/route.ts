import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, getAuthUser, isAdmin, ROLES, requireVerifiedBuyer } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { PUBLIC_CACHE_TTL, rememberPublicCache, rfqBoardCacheKey, invalidateRFQCaches } from '@/lib/cache/public'
import { createNotification } from '@/server/services/notification'
import { sendNewRFQEmail } from '@/lib/email'
import { getAiMatchedSupplierOwnersForRFQ } from '@/lib/ai/rfq-matching'
import { buildPublicActiveRFQWhere } from '@/lib/rfqs/visibility'
import { trackCompanyRfqs } from '@/lib/analytics/tracking'
import { scheduleSearchSync } from '@/lib/search/sync'
import { FraudEventType } from '@prisma/client'
import { assertFraudActionAllowed, screenFraudEvent } from '@/lib/fraud/service'
import { FRAUD_ACTIONS } from '@/lib/fraud/shared'

const createRFQSchema = z.object({
  categoryId: z.string().optional(),
  productName: z.string().min(3).max(200),
  quantity: z.string(),
  unit: z.string().optional(),
  destinationCountryId: z.string().optional(),
  budget: z.number().positive().optional(),
  currencyId: z.string().optional(),
  requiredDate: z.string().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const authUser = await getAuthUser(req)
    const now = new Date()
    const where: Record<string, unknown> = { deletedAt: null }

    if (
      !authUser ||
      (
        !isAdmin(authUser) &&
        !authUser.roles.includes(ROLES.SUPPLIER_OWNER) &&
        !authUser.roles.includes(ROLES.SUPPLIER_STAFF)
      )
    ) {
      Object.assign(where, buildPublicActiveRFQWhere(now))
    } else if (authUser.roles.includes(ROLES.BUYER)) {
      where.buyerId = authUser.userId
    }

    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    if (status && authUser && isAdmin(authUser)) where.status = status
    if (categoryId) where.categoryId = categoryId

    const isSupplierViewer = !!authUser && (
      authUser.roles.includes(ROLES.SUPPLIER_OWNER) ||
      authUser.roles.includes(ROLES.SUPPLIER_STAFF)
    ) && !!authUser.companyId

    const include = {
      buyer: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      category: { select: { id: true, name: true } },
      destinationCountry: { select: { name: true, code: true } },
      currency: { select: { code: true, symbol: true } },
      _count: { select: { quotations: true } },
      ...(isSupplierViewer
        ? {
          quotations: {
            where: { companyId: authUser.companyId },
            select: { id: true, status: true, createdAt: true },
            take: 1,
            orderBy: { createdAt: 'desc' as const },
          },
        }
        : {}),
    }

    const runQuery = async () => {
      const [rfqs, total] = await Promise.all([
        prisma.rFQ.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include,
        }),
        prisma.rFQ.count({ where }),
      ])

      return { rfqs, total }
    }

    const result = (!authUser || (!isAdmin(authUser) && !authUser.roles.includes(ROLES.BUYER)))
      ? await rememberPublicCache(rfqBoardCacheKey(searchParams.toString()), PUBLIC_CACHE_TTL.rfqBoard, runQuery)
      : await runQuery()

    return successResponse(result.rfqs, 'RFQs fetched', paginationMeta(result.total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const baseUser = await requireAuth(req)
    const body = await req.json()
    const data = createRFQSchema.parse(body)
    const authUser = isAdmin(baseUser) ? baseUser : await requireVerifiedBuyer(baseUser)

    await assertFraudActionAllowed({
      userId: authUser.userId,
      action: FRAUD_ACTIONS.RFQ_CREATE,
    })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const rfq = await prisma.rFQ.create({
      data: {
        buyerId: authUser.userId,
        categoryId: data.categoryId,
        productName: data.productName,
        quantity: data.quantity,
        unit: data.unit,
        destinationCountryId: data.destinationCountryId,
        budget: data.budget,
        currencyId: data.currencyId,
        requiredDate: data.requiredDate ? new Date(data.requiredDate) : null,
        description: data.description,
        isPublic: data.isPublic,
        expiresAt,
        status: 'OPEN',
      },
    })

    // Notify matching suppliers (AI-ranked first, category fallback)
    if (rfq.isPublic) {
      const notifiedCompanyIds: string[] = []
      const matchedOwners = await getAiMatchedSupplierOwnersForRFQ(rfq.id)
      if (matchedOwners.length) {
        for (const entry of matchedOwners) {
          const owner = entry.owner
          if (!owner) continue
          notifiedCompanyIds.push(entry.company.id)

          await createNotification({
            userId: owner.userId,
            type: 'NEW_RFQ',
            title: 'New RFQ Matching Your Products',
            message: `New RFQ: "${rfq.productName}" - Qty: ${rfq.quantity}. Match score ${entry.score}.`,
            data: { rfqId: rfq.id, companyId: entry.company.id, matchScore: entry.score, rank: entry.rank },
          })

          try {
            await sendNewRFQEmail(owner.user.email, owner.user.firstName, rfq.productName, rfq.id)
          } catch (emailError) {
            console.error('RFQ email failed:', emailError)
          }
        }
      } else {
        const fallbackCompanies = await prisma.company.findMany({
          where: {
            status: 'ACTIVE',
            deletedAt: null,
            ...(data.categoryId
              ? { products: { some: { categoryId: data.categoryId, status: 'APPROVED', deletedAt: null } } }
              : {}),
          },
          include: {
            companyUsers: {
              where: { isPrimary: true },
              include: { user: { select: { email: true, firstName: true, id: true } } },
            },
          },
          take: 20,
        })

        for (const company of fallbackCompanies) {
          const owner = company.companyUsers[0]
          if (!owner) continue
          notifiedCompanyIds.push(company.id)

          await createNotification({
            userId: owner.userId,
            type: 'NEW_RFQ',
            title: 'New RFQ Matching Your Products',
            message: `New RFQ: "${rfq.productName}" - Qty: ${rfq.quantity}.`,
            data: { rfqId: rfq.id, companyId: company.id, fallback: true },
          })

          try {
            await sendNewRFQEmail(owner.user.email, owner.user.firstName, rfq.productName, rfq.id)
          } catch (emailError) {
            console.error('RFQ email failed:', emailError)
          }
        }
      }

      await trackCompanyRfqs(notifiedCompanyIds)
    }

    await screenFraudEvent({
      req,
      actorUserId: authUser.userId,
      userId: authUser.userId,
      eventType: FraudEventType.RFQ_CREATE,
      sourceModule: 'rfqs',
      title: 'RFQ created',
      summary: `RFQ "${rfq.productName}" submitted by buyer.`,
      payload: {
        productName: data.productName,
        quantity: data.quantity,
        budget: data.budget,
        destinationCountryId: data.destinationCountryId,
        isPublic: data.isPublic,
      },
    })

    await invalidateRFQCaches()
    await scheduleSearchSync('rfq', rfq.id, 'upsert')

    return successResponse(rfq, 'RFQ created successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
