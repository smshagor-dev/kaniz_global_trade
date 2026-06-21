import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const documentsSchema = z.object({
  documents: z.array(
    z.object({
      name: z.string().min(1),
      url: z.string().url(),
      type: z.string().optional(),
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
    const data = documentsSchema.parse(body)

    await prisma.productDocument.deleteMany({ where: { productId: id } })

    if (!data.documents.length) {
      return successResponse([], 'Product documents cleared')
    }

    await prisma.productDocument.createMany({
      data: data.documents.map((document) => ({
        productId: id,
        name: document.name,
        url: document.url,
        type: document.type,
      })),
    })

    return successResponse(null, 'Product documents saved')
  } catch (error) {
    return handleApiError(error)
  }
}
