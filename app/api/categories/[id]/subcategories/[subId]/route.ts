import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ApiError, isAdmin, isSupplier } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { slugify } from '@/lib/utils/slug'

const updateSubcategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  rejectedReason: z.string().optional().nullable(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id, subId } = await params
    const body = await req.json()
    const data = updateSubcategorySchema.parse(body)
    const userIsAdmin = isAdmin(authUser)
    const userIsSupplier = isSupplier(authUser)

    const subcategory = await prisma.subCategory.findFirst({
      where: { id: subId, categoryId: id },
      select: { id: true, createdById: true, source: true, approvalStatus: true },
    })
    if (!subcategory) throw new ApiError(404, 'Sub-category not found')
    if (!userIsAdmin && !userIsSupplier) throw new ApiError(403, 'Access denied')
    if (!userIsAdmin && subcategory.source === 'ADMIN') {
      throw new ApiError(403, 'Supplier cannot edit admin-created sub-categories')
    }
    if (!userIsAdmin && subcategory.createdById !== authUser.userId) {
      throw new ApiError(403, 'You can only edit your own sub-categories')
    }

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
        approvalStatus: userIsAdmin ? data.approvalStatus || subcategory.approvalStatus : 'PENDING',
        rejectedReason: userIsAdmin
          ? data.approvalStatus === 'REJECTED'
            ? data.rejectedReason || null
            : null
          : null,
        approvedById: userIsAdmin && data.approvalStatus === 'APPROVED' ? authUser.userId : null,
        approvedAt: userIsAdmin && data.approvalStatus === 'APPROVED' ? new Date() : null,
      },
    })

    return successResponse(updated, userIsAdmin ? 'Sub-category updated' : 'Sub-category resubmitted for approval')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    if (!isAdmin(authUser)) throw new ApiError(403, 'Admin access required')
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
