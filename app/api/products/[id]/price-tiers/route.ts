import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { invalidateProductCaches } from '@/lib/cache/public'

const priceTiersSchema = z.object({
  priceTiers: z.array(
    z.object({
      minQty: z.number().positive(),
      maxQty: z.number().positive().optional().nullable(),
      priceMin: z.number().nonnegative(),
      priceMax: z.number().nonnegative().optional().nullable(),
    }).refine((tier) => tier.maxQty == null || tier.maxQty >= tier.minQty, {
      message: 'Maximum order quantity must be greater than or equal to minimum order quantity',
      path: ['maxQty'],
    }).refine((tier) => tier.priceMax == null || tier.priceMax >= tier.priceMin, {
      message: 'Maximum price must be greater than or equal to minimum price',
      path: ['priceMax'],
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
    const data = priceTiersSchema.parse(body)

    await prisma.productPriceTier.deleteMany({ where: { productId: id } })

    if (data.priceTiers.length) {
      await prisma.productPriceTier.createMany({
        data: data.priceTiers.map((tier) => ({
          productId: id,
          minQty: tier.minQty,
          maxQty: tier.maxQty ?? null,
          priceMin: tier.priceMin,
          priceMax: tier.priceMax ?? null,
        })),
      })
    }

    await invalidateProductCaches(product.id, product.slug)
    return successResponse(null, 'Product price tiers saved')
  } catch (error) {
    return handleApiError(error)
  }
}
