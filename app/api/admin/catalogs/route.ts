import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'
import { uniqueSlug } from '@/lib/utils/slug'

const createCatalogSchema = z.object({
  companyId: z.string(),
  categoryId: z.string(),
  subcategoryId: z.string().optional(),
  name: z.string().min(3).max(500),
  shortDescription: z.string().max(500).optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  moq: z.number().positive().optional(),
  moqUnit: z.string().optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  priceNegotiable: z.boolean().default(true),
  productionCapacity: z.string().optional(),
  leadTime: z.string().optional(),
  packagingDetails: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).default('APPROVED'),
  isFeatured: z.boolean().default(false),
  isVerified: z.boolean().default(false),
  images: z.array(z.object({ url: z.string().url(), isPrimary: z.boolean().optional().default(false), alt: z.string().optional() })).optional(),
  specifications: z.array(z.object({ key: z.string().min(1), value: z.string().min(1), unit: z.string().optional() })).optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)

    const q = searchParams.get('q')
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')

    const where: Record<string, unknown> = { deletedAt: null }
    if (status) where.status = status
    if (categoryId) where.categoryId = categoryId
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { shortDescription: { contains: q } },
        { company: { name: { contains: q } } },
        { category: { name: { contains: q } } },
        { subcategory: { name: { contains: q } } },
      ]
    }

    const [catalogs, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          company: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          subcategory: { select: { id: true, name: true } },
        },
      }),
      prisma.product.count({ where }),
    ])

    return successResponse(catalogs, 'Catalogs fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json()
    const data = createCatalogSchema.parse(body)

    const company = await prisma.company.findUnique({ where: { id: data.companyId }, select: { id: true } })
    if (!company) throw new ApiError(404, 'Company not found')

    const slug = await uniqueSlug(data.name, async (candidate) => {
      const existing = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
      return !!existing
    })

    const product = await prisma.product.create({
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
        images: data.images?.length
          ? {
              create: data.images.map((image, index) => ({
                url: image.url,
                alt: image.alt,
                isPrimary: image.isPrimary || index === 0,
                sortOrder: index,
              })),
            }
          : undefined,
        specifications: data.specifications?.length
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

    return successResponse(product, 'Catalog created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
