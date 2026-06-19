import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, getAuthUser } from '@/lib/permissions'
import { successResponse, handleApiError } from '@/lib/utils/api'

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
          ? { where: { isActive: true }, orderBy: { name: 'asc' } }
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

    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing) {
      return successResponse(null, 'Slug already exists', undefined, 409)
    }

    const category = await prisma.category.create({ data: { ...data, slug } })
    return successResponse(category, 'Category created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
