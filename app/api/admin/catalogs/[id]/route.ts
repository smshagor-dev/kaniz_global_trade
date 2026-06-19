import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { slugify } from '@/lib/utils/slug'

const updateCatalogSchema = z.object({
  companyId: z.string(),
  categoryId: z.string(),
  subcategoryId: z.string().optional().nullable(),
  name: z.string().min(3).max(500),
  slug: z.string().optional(),
  shortDescription: z.string().max(500).optional().nullable(),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  moq: z.number().nonnegative().optional().nullable(),
  moqUnit: z.string().optional().nullable(),
  priceMin: z.number().nonnegative().optional().nullable(),
  priceMax: z.number().nonnegative().optional().nullable(),
  priceNegotiable: z.boolean().default(true),
  productionCapacity: z.string().optional().nullable(),
  leadTime: z.string().optional().nullable(),
  packagingDetails: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']),
  isFeatured: z.boolean().default(false),
  isVerified: z.boolean().default(false),
  images: z.array(z.object({ url: z.string().url(), isPrimary: z.boolean().optional().default(false), alt: z.string().optional() })).default([]),
  specifications: z.array(z.object({ key: z.string().min(1), value: z.string().min(1), unit: z.string().optional() })).default([]),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req)
    const { id } = await params

    const catalog = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        specifications: { orderBy: { sortOrder: 'asc' } },
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    })

    if (!catalog) throw new ApiError(404, 'Catalog not found')
    return successResponse(catalog)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req)
    const { id } = await params
    const body = await req.json()
    const data = updateCatalogSchema.parse(body)

    const current = await prisma.product.findUnique({ where: { id }, select: { id: true } })
    if (!current) throw new ApiError(404, 'Catalog not found')

    const slug = data.slug ? slugify(data.slug) : slugify(data.name)
    const existing = await prisma.product.findFirst({
      where: { slug, id: { not: id } },
      select: { id: true },
    })
    if (existing) throw new ApiError(409, 'Slug already exists')

    const updated = await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: id } })
      await tx.productSpecification.deleteMany({ where: { productId: id } })

      return tx.product.update({
        where: { id },
        data: {
          companyId: data.companyId,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId || null,
          name: data.name,
          slug,
          shortDescription: data.shortDescription,
          description: data.description,
          sku: data.sku,
          moq: data.moq,
          moqUnit: data.moqUnit,
          priceMin: data.priceMin,
          priceMax: data.priceMax,
          priceNegotiable: data.priceNegotiable,
          productionCapacity: data.productionCapacity,
          leadTime: data.leadTime,
          packagingDetails: data.packagingDetails,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          status: data.status,
          isFeatured: data.isFeatured,
          isVerified: data.isVerified,
          images: data.images.length
            ? {
                create: data.images.map((image, index) => ({
                  url: image.url,
                  alt: image.alt,
                  isPrimary: image.isPrimary || index === 0,
                  sortOrder: index,
                })),
              }
            : undefined,
          specifications: data.specifications.length
            ? {
                create: data.specifications.map((specification, index) => ({
                  key: specification.key,
                  value: specification.value,
                  unit: specification.unit,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
      })
    })

    return successResponse(updated, 'Catalog updated')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req)
    const { id } = await params

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return successResponse(null, 'Catalog deleted')
  } catch (error) {
    return handleApiError(error)
  }
}
