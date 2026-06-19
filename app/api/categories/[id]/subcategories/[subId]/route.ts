import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { slugify } from '@/lib/utils/slug'

const updateSubcategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    await requireAdmin(req)
    const { id, subId } = await params
    const body = await req.json()
    const data = updateSubcategorySchema.parse(body)

    const subcategory = await prisma.subCategory.findFirst({
      where: { id: subId, categoryId: id },
      select: { id: true },
    })
    if (!subcategory) throw new ApiError(404, 'Sub-category not found')

    const slug = data.slug ? slugify(data.slug) : slugify(data.name)
    const existing = await prisma.subCategory.findFirst({
      where: { slug, id: { not: subId } },
      select: { id: true },
    })
    if (existing) throw new ApiError(409, 'Slug already exists')

    const updated = await prisma.subCategory.update({
      where: { id: subId },
      data: {
        name: data.name,
        slug,
        description: data.description,
        isActive: data.isActive,
      },
    })

    return successResponse(updated, 'Sub-category updated')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    await requireAdmin(req)
    const { id, subId } = await params

    const subcategory = await prisma.subCategory.findFirst({
      where: { id: subId, categoryId: id },
      include: { products: { select: { id: true }, take: 1 } },
    })
    if (!subcategory) throw new ApiError(404, 'Sub-category not found')
    if (subcategory.products.length) throw new ApiError(400, 'Cannot delete sub-category with products')

    await prisma.subCategory.delete({ where: { id: subId } })
    return successResponse(null, 'Sub-category deleted')
  } catch (error) {
    return handleApiError(error)
  }
}
