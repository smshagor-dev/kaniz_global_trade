import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, getAuthUser, isAdmin, ApiError } from '@/lib/permissions'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { logUpdate, logDelete } from '@/lib/utils/audit'
import { indexProduct, removeProductFromIndex } from '@/lib/search'

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
        documents: true,
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
    const userIsAdmin = isAdmin(authUser)
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) throw new ApiError(404, 'Product not found')

    await requireCompanyAccess(req, product.companyId)

    const body = await req.json()
    const data = z.object({
      name: z.string().min(3).optional(),
      tags: z.string().optional(),
      shortDescription: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.string().optional(),
      subcategoryId: z.string().optional(),
      sku: z.string().optional(),
      barcode: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      moq: z.number().positive().optional(),
      priceMin: z.number().positive().optional(),
      priceMax: z.number().positive().optional(),
      priceNegotiable: z.boolean().optional(),
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
    }).parse(body)

    const updateData: Record<string, unknown> = { ...data }

    if (userIsAdmin) {
      if (!data.status) {
        delete updateData.status
      }

      if (data.status === 'APPROVED') {
        updateData.approvedAt = new Date()
        updateData.approvedBy = authUser.userId
      } else if (data.status) {
        updateData.approvedAt = null
        updateData.approvedBy = null
      }
    } else {
      updateData.status = 'PENDING'
      updateData.approvedAt = null
      updateData.approvedBy = null
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    })

    await logUpdate(authUser.userId, 'products', 'Product', id, product, data)

    if (updated.status === 'APPROVED') {
      try {
        await indexProduct({
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          shortDescription: updated.shortDescription,
          companyId: updated.companyId,
          categoryId: updated.categoryId,
          priceMin: updated.priceMin?.toString(),
          priceMax: updated.priceMax?.toString(),
          moq: updated.moq?.toString(),
          status: updated.status,
          isFeatured: updated.isFeatured,
        })
      } catch { /* non-critical */ }
    } else {
      await removeProductFromIndex(updated.id)
    }

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
