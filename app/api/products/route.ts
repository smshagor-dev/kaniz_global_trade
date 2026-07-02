import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireCompanyAccess, getAuthUser, isAdmin, ROLES, ApiError, requireVerifiedSupplier } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { logCreate } from '@/lib/utils/audit'
import { invalidateProductCaches } from '@/lib/cache/public'
import { scheduleSearchSync } from '@/lib/search/sync'
import { uniqueSlug } from '@/lib/utils/slug'
import { FraudEventType } from '@prisma/client'
import { assertFraudActionAllowed, screenFraudEvent } from '@/lib/fraud/service'
import { FRAUD_ACTIONS } from '@/lib/fraud/shared'

const createProductSchema = z.object({
  companyId: z.string(),
  categoryId: z.string(),
  subcategoryId: z.string().optional(),
  name: z.string().min(3).max(500),
  tags: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  hsCodeId: z.string().optional(),
  moq: z.number().positive().optional(),
  moqUnit: z.string().optional(),
  unitTypeId: z.string().optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  currencyId: z.string().optional(),
  priceNegotiable: z.boolean().default(true),
  productionCapacity: z.string().optional(),
  leadTime: z.string().optional(),
  packagingDetails: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  seoImageUrl: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isTodaysDeal: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'SUSPENDED']).optional(),
})

function slugToken(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12) || 'PRODUCT'
}

function generatedSku(name: string) {
  return `SKU-${slugToken(name)}-${Date.now().toString().slice(-6)}`
}

function generatedBarcode() {
  const seed = `${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`
  return seed.slice(0, 13)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const authUser = await getAuthUser(req)

    const where: Record<string, unknown> = { deletedAt: null }

    // Public users only see approved products
    if (!authUser || (!isAdmin(authUser) && !authUser.roles.includes(ROLES.SUPPLIER_OWNER) && !authUser.roles.includes(ROLES.SUPPLIER_STAFF))) {
      where.status = 'APPROVED'
      where.category = { approvalStatus: 'APPROVED', isActive: true }
      where.AND = [
        {
          OR: [
            { subcategoryId: null },
            { subcategory: { approvalStatus: 'APPROVED', isActive: true } },
          ],
        },
      ]
    } else if ((authUser.roles.includes(ROLES.SUPPLIER_OWNER) || authUser.roles.includes(ROLES.SUPPLIER_STAFF)) && !isAdmin(authUser)) {
      // Suppliers see their own company products
      const companyId = searchParams.get('companyId')
      if (companyId) {
        await requireCompanyAccess(req, companyId)
        where.companyId = companyId
      } else {
        where.status = 'APPROVED'
      }
    }

    const categoryId = searchParams.get('categoryId')
    const subcategoryId = searchParams.get('subcategoryId')
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const isFeatured = searchParams.get('isFeatured')
    const countryId = searchParams.get('countryId')
    const verified = searchParams.get('verified')
    const search = searchParams.get('q')

    if (categoryId) where.categoryId = categoryId
    if (subcategoryId) where.subcategoryId = subcategoryId
    if (companyId && authUser && isAdmin(authUser)) where.companyId = companyId
    if (status && authUser && isAdmin(authUser)) where.status = status
    if (isFeatured === 'true') where.isFeatured = true
    if (verified === 'true') where.company = { verificationStatus: { in: ['ADMIN_VERIFIED', 'PREMIUM_VERIFIED'] } }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { shortDescription: { contains: search } },
        { tags: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
        { category: { name: { contains: search } } },
        { subcategory: { name: { contains: search } } },
        { company: { name: { contains: search } } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isFeatured: 'desc' },
          { totalViews: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              verificationStatus: true,
              fraudPublicFlag: true,
              country: { select: { name: true, code: true } },
            },
          },
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          currency: { select: { id: true, code: true, symbol: true } },
        },
      }),
      prisma.product.count({ where }),
    ])

    return successResponse(products, 'Products fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = createProductSchema.parse(body)
    const authUser = await requireVerifiedSupplier(req, data.companyId)
    const userIsAdmin = isAdmin(authUser)

    // Verify company access
    await requireCompanyAccess(req, data.companyId)
    await assertFraudActionAllowed({
      userId: authUser.userId,
      companyId: data.companyId,
      action: FRAUD_ACTIONS.PRODUCT_CREATE,
    })

    // Check subscription product limit
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: data.companyId },
      include: { plan: true },
    })

    if (subscription?.plan) {
      const productCount = await prisma.product.count({
        where: { companyId: data.companyId, deletedAt: null, status: { not: 'REJECTED' } },
      })
      if (productCount >= subscription.plan.maxProducts) {
        throw new ApiError(403, `Product limit reached. Upgrade your plan to add more products.`)
      }
    }

    // Generate unique slug
    const slug = await uniqueSlug(data.name, async (candidate) => {
      const existing = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
      return !!existing
    })

    let status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'SUSPENDED' = userIsAdmin ? data.status || 'APPROVED' : 'APPROVED'

    if (!userIsAdmin) {
      const activeFraudAlerts = await prisma.fraudAlert.count({
        where: {
          targetCompanyId: data.companyId,
          status: { in: ['OPEN', 'INVESTIGATING', 'WATCHLIST'] },
        },
      })

      if (activeFraudAlerts > 0) {
        status = 'PENDING'
      }
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        sku: data.sku || generatedSku(data.name),
        barcode: data.barcode || generatedBarcode(),
        slug,
        status,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        approvedBy: status === 'APPROVED' ? authUser.userId : null,
      },
    })

    await logCreate(authUser.userId, 'products', 'Product', product.id, { name: product.name })

    await invalidateProductCaches(product.id, product.slug)
    await scheduleSearchSync('product', product.id, status === 'APPROVED' ? 'upsert' : 'remove')

    await screenFraudEvent({
      req,
      actorUserId: authUser.userId,
      userId: authUser.userId,
      companyId: data.companyId,
      eventType: FraudEventType.PRODUCT_CREATE,
      sourceModule: 'products',
      title: 'Supplier product created',
      summary: `Product "${product.name}" created in marketplace.`,
      payload: {
        name: data.name,
        categoryId: data.categoryId,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
        moq: data.moq,
        tags: data.tags,
        shortDescription: data.shortDescription,
        status,
      },
    })

    return successResponse(
      product,
      status === 'APPROVED'
        ? 'Product created and published.'
        : 'Product submitted for review because this supplier is under fraud review.',
      undefined,
      201
    )
  } catch (error) {
    return handleApiError(error)
  }
}
