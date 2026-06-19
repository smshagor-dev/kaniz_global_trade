import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, getAuthUser, isAdmin, ROLES, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { logCreate } from '@/lib/utils/audit'
import { indexProduct } from '@/lib/search'
import { createNotification } from '@/server/services/notification'

const createProductSchema = z.object({
  companyId: z.string(),
  categoryId: z.string(),
  subcategoryId: z.string().optional(),
  name: z.string().min(3).max(500),
  shortDescription: z.string().max(500).optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
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
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const authUser = await getAuthUser(req)

    const where: Record<string, unknown> = { deletedAt: null }

    // Public users only see approved products
    if (!authUser || (!isAdmin(authUser) && !authUser.roles.includes(ROLES.SUPPLIER_OWNER))) {
      where.status = 'APPROVED'
    } else if (authUser.roles.includes(ROLES.SUPPLIER_OWNER) && !isAdmin(authUser)) {
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
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const isFeatured = searchParams.get('isFeatured')
    const countryId = searchParams.get('countryId')
    const search = searchParams.get('q')

    if (categoryId) where.categoryId = categoryId
    if (companyId && isAdmin(authUser!)) where.companyId = companyId
    if (status && isAdmin(authUser!)) where.status = status
    if (isFeatured === 'true') where.isFeatured = true

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { shortDescription: { contains: search } },
        { sku: { contains: search } },
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
              country: { select: { name: true, code: true } },
            },
          },
          category: { select: { id: true, name: true, slug: true } },
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
    const authUser = await requireAuth(req)
    const body = await req.json()
    const data = createProductSchema.parse(body)

    // Verify company access
    await requireCompanyAccess(req, data.companyId)

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
    const baseSlug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80)

    let slug = baseSlug
    let counter = 0
    while (await prisma.product.findUnique({ where: { slug } })) {
      counter++
      slug = `${baseSlug}-${counter}`
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        slug,
        status: 'PENDING',
      },
    })

    await logCreate(authUser.userId, 'products', 'Product', product.id, { name: product.name })

    // Notify admins of new product pending review
    const admins = await prisma.userRole.findMany({
      where: { role: { name: { in: ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'] } } },
      select: { userId: true },
    })

    for (const admin of admins) {
      await createNotification({
        userId: admin.userId,
        type: 'PRODUCT_APPROVED',
        title: 'New product pending review',
        message: `Product "${product.name}" is waiting for approval`,
        data: { productId: product.id },
      })
    }

    return successResponse(product, 'Product created. Pending admin review.', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
