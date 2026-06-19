import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, getAuthUser, isAdmin, ApiError } from '@/lib/permissions'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { logUpdate, logDelete, logApprove, logReject } from '@/lib/utils/audit'
import { indexProduct, removeProductFromIndex } from '@/lib/search'
import { createNotification } from '@/server/services/notification'
import { sendProductApprovalEmail } from '@/lib/email'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        videos: true,
        variants: true,
        specifications: { orderBy: { sortOrder: 'asc' } },
        certificates: true,
        priceTiers: { orderBy: { minQty: 'asc' } },
        exportMarkets: { include: { country: { select: { name: true, code: true } } } },
        shippingMethods: { include: { shippingMethod: true } },
        paymentTerms: { include: { paymentTerm: true } },
        tradeTerms: { include: { tradeTerm: true } },
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        hsCode: { select: { code: true, description: true } },
        unitType: { select: { name: true, code: true } },
        currency: { select: { code: true, symbol: true } },
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            businessType: true,
            verificationStatus: true,
            isPremium: true,
            country: { select: { name: true, code: true, flag: true } },
          },
        },
      },
    })

    if (!product) return errorResponse('Product not found', 404)

    // Track views
    const authUser = await getAuthUser(req)
    if (!authUser || !authUser.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(r))) {
      prisma.product.update({
        where: { id: product.id },
        data: { totalViews: { increment: 1 } },
      }).catch(() => {})

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      prisma.productAnalytic.upsert({
        where: { productId_date: { productId: product.id, date: today } },
        create: { productId: product.id, date: today, views: 1 },
        update: { views: { increment: 1 } },
      }).catch(() => {})
    }

    return successResponse(product)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await requireAuth(req)
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) throw new ApiError(404, 'Product not found')

    await requireCompanyAccess(req, product.companyId)

    const body = await req.json()
    const data = z.object({
      name: z.string().min(3).optional(),
      shortDescription: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.string().optional(),
      subcategoryId: z.string().optional(),
      sku: z.string().optional(),
      moq: z.number().positive().optional(),
      priceMin: z.number().positive().optional(),
      priceMax: z.number().positive().optional(),
      priceNegotiable: z.boolean().optional(),
      productionCapacity: z.string().optional(),
      leadTime: z.string().optional(),
      packagingDetails: z.string().optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      status: z.enum(['DRAFT', 'PENDING']).optional(),
    }).parse(body)

    const updated = await prisma.product.update({
      where: { id },
      data: { ...data, status: 'PENDING' }, // Re-submit for approval on update
    })

    await logUpdate(authUser.userId, 'products', 'Product', id, product, data)

    return successResponse(updated, 'Product updated')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await requireAuth(req)
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) throw new ApiError(404, 'Product not found')

    if (!isAdmin(authUser)) {
      await requireCompanyAccess(req, product.companyId)
    }

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await removeProductFromIndex(id)
    await logDelete(authUser.userId, 'products', 'Product', id)

    return successResponse(null, 'Product deleted')
  } catch (error) {
    return handleApiError(error)
  }
}
