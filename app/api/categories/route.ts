import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, getAuthUser } from '@/lib/permissions'
import { successResponse, handleApiError } from '@/lib/utils/api'
import { slugify, uniqueSlug } from '@/lib/utils/slug'

const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().default(0),
  seoTitle: z.string().optional(),
  seoDesc: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const withSubs  = searchParams.get('withSubs') === 'true'
    const parentOnly = searchParams.get('parentOnly') === 'true'

    const where: Record<string, unknown> = { isActive: true }
    if (parentOnly) where.parentId = null

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        subcategories: withSubs
          ? {
              where: { isActive: true },
              orderBy: { name: 'asc' },
              include: { _count: { select: { products: true } } },
            }
          : false,
        _count: { select: { products: true } },
      },
    })

    return successResponse(categories)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json()
    const data = createCategorySchema.parse(body)

    if (data.parentId) {
      const category = await prisma.category.findUnique({ where: { id: data.parentId }, select: { id: true } })
      if (!category) {
        return successResponse(null, 'Parent category not found', undefined, 404)
      }

      const slug = data.slug
        ? slugify(data.slug)
        : await uniqueSlug(data.name, async (candidate) => {
            const existing = await prisma.subCategory.findUnique({ where: { slug: candidate }, select: { id: true } })
            return !!existing
          })

      const subcategory = await prisma.subCategory.create({
        data: {
          categoryId: data.parentId,
          name: data.name,
          slug,
          description: data.description,
          isActive: true,
        },
      })

      return successResponse(subcategory, 'Sub-category created', undefined, 201)
    }

    const slug = data.slug
      ? slugify(data.slug)
      : await uniqueSlug(data.name, async (candidate) => {
          const existing = await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } })
          return !!existing
        })

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        icon: data.icon,
        image: data.image,
        sortOrder: data.sortOrder,
        seoTitle: data.seoTitle,
        seoDesc: data.seoDesc,
      },
    })
    return successResponse(category, 'Category created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
