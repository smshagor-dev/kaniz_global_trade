import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { slugify } from '@/lib/utils/slug'

const updateCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  seoTitle: z.string().optional().nullable(),
  seoDesc: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req)
    const { id } = await params
    const body = await req.json()
    const data = updateCategorySchema.parse(body)

    const category = await prisma.category.findUnique({ where: { id } })
    if (!category) throw new ApiError(404, 'Category not found')

    const slug = data.slug ? slugify(data.slug) : slugify(data.name)

    const existing = await prisma.category.findFirst({
      where: {
        slug,
        id: { not: id },
      },
      select: { id: true },
    })
    if (existing) throw new ApiError(409, 'Slug already exists')

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...data,
        slug,
        parentId: data.parentId || null,
      },
    })

    return successResponse(updated, 'Category updated')
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

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: { select: { id: true }, take: 1 },
        children: { select: { id: true }, take: 1 },
        subcategories: { select: { id: true }, take: 1 },
      },
    })

    if (!category) throw new ApiError(404, 'Category not found')
    if (category.products.length || category.children.length || category.subcategories.length) {
      throw new ApiError(400, 'Cannot delete category with products or child categories')
    }

    await prisma.category.delete({ where: { id } })
    return successResponse(null, 'Category deleted')
  } catch (error) {
    return handleApiError(error)
  }
}
