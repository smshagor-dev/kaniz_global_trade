import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, getAuthUser, isAdmin, ROLES, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { createNotification } from '@/server/services/notification'
import { sendNewRFQEmail } from '@/lib/email'
import { getSmartMatchesForRFQ } from '@/lib/ai/rfq-matching'
import { buildPublicActiveRFQWhere } from '@/lib/rfqs/visibility'

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

    const [rfqs, total] = await Promise.all([
      prisma.rFQ.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include,
      }),
      prisma.rFQ.count({ where }),
    ])

    return successResponse(rfqs, 'RFQs fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)

    if (!authUser.roles.includes(ROLES.BUYER) && !isAdmin(authUser)) {
      throw new ApiError(403, 'Only buyers can create RFQs')
    }

    const body = await req.json()
    const data = createRFQSchema.parse(body)

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
      const smartMatches = await getSmartMatchesForRFQ(rfq.id)
      const matchedCompanyIds = smartMatches?.matches.map((match) => match.companyId) || []
      const matchingCompanies = await prisma.company.findMany({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          ...(matchedCompanyIds.length
            ? { id: { in: matchedCompanyIds } }
            : data.categoryId
              ? { products: { some: { categoryId: data.categoryId, status: 'APPROVED' } } }
              : {}),
        },
        include: {
          companyUsers: {
            where: { isPrimary: true },
            include: { user: { select: { email: true, firstName: true, id: true } } },
          },
        },
        take: 50,
      })

      for (const company of matchingCompanies) {
        const owner = company.companyUsers[0]
        if (!owner) continue

        await createNotification({
          userId: owner.userId,
          type: 'NEW_RFQ',
          title: 'New RFQ Matching Your Products',
          message: `New RFQ: "${rfq.productName}" - Qty: ${rfq.quantity}`,
          data: { rfqId: rfq.id },
        })

        try {
          await sendNewRFQEmail(owner.user.email, owner.user.firstName, rfq.productName, rfq.id)
        } catch (emailError) {
          console.error('RFQ email failed:', emailError)
        }
      }
    }

    return successResponse(rfq, 'RFQ created successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
