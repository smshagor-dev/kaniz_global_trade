import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const imagesSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().url(),
      isPrimary: z.boolean().optional().default(false),
      alt: z.string().optional(),
    })
  ).default([]),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req)
    const { id } = await params
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) throw new ApiError(404, 'Product not found')

    await requireCompanyAccess(req, product.companyId)
    const body = await req.json()
    const data = imagesSchema.parse(body)

    await prisma.productImage.deleteMany({ where: { productId: id } })

    if (!data.images.length) {
      return successResponse([], 'Product images cleared')
    }

    const created = await prisma.productImage.createMany({
      data: data.images.map((image, index) => ({
        productId: id,
        url: image.url,
        alt: image.alt,
        isPrimary: image.isPrimary || index === 0,
        sortOrder: index,
      })),
    })

    return successResponse(created, 'Product images saved')
  } catch (error) {
    return handleApiError(error)
  }
}
