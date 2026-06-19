import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const specificationsSchema = z.object({
  specifications: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string().min(1),
      unit: z.string().optional(),
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
    const data = specificationsSchema.parse(body)

    await prisma.productSpecification.deleteMany({ where: { productId: id } })

    if (!data.specifications.length) {
      return successResponse([], 'Specifications cleared')
    }

    await prisma.productSpecification.createMany({
      data: data.specifications.map((specification, index) => ({
        productId: id,
        key: specification.key,
        value: specification.value,
        unit: specification.unit,
        sortOrder: index,
      })),
    })

    return successResponse(null, 'Specifications saved')
  } catch (error) {
    return handleApiError(error)
  }
}
