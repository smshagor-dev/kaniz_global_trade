import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError, isAdmin, isSupplier } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { ensureServicePartnersSeeded, getDefaultPartner } from '@/lib/partners/server'
import { createNotification } from '@/server/services/notification'
import { formatInsurancePolicy } from '@/lib/insurance/policy'

const createSchema = z.object({
  productId: z.string().optional(),
  tradeOrderId: z.string().optional(),
  sampleOrderId: z.string().optional(),
  partnerId: z.string().optional(),
  providerName: z.string().min(2).optional(),
  policyType: z.string().default('CARGO_INSURANCE'),
  insuredAmount: z.number().positive(),
  premiumAmount: z.number().nonnegative(),
  currencyCode: z.string().default('USD'),
  coverageSummary: z.string().optional(),
  claimInstructions: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await ensureServicePartnersSeeded()
    const authUser = await requireAuth(req)
    const where: Record<string, unknown> = {}
    const isUserAdmin = isAdmin(authUser)
    const isUserSupplier = isSupplier(authUser)

    if (authUser.roles.includes(ROLES.BUYER)) where.buyerId = authUser.userId
    else if (authUser.companyId && !isUserAdmin) where.companyId = authUser.companyId

    const policyQuery = prisma.insurancePolicy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        product: { select: { id: true, name: true, slug: true, sku: true, barcode: true, priceMin: true, currency: { select: { code: true } } } },
        partner: { select: { id: true, code: true, name: true, type: true, isDefault: true } },
        tradeOrder: { select: { id: true, productName: true, totalAmount: true, currencyCode: true, status: true } },
        sampleOrder: { select: { id: true, title: true, totalAmount: true, currencyCode: true, status: true } },
        claims: { orderBy: { createdAt: 'desc' } },
      },
    })

    const partnerQuery = prisma.servicePartner.findMany({
      where: { type: 'INSURANCE', isActive: true },
      select: { id: true, name: true, code: true, description: true, isDefault: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    const sourceQuery =
      isUserSupplier && authUser.companyId
        ? Promise.all([
            prisma.product.findMany({
              where: { companyId: authUser.companyId, deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 100,
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
                barcode: true,
                priceMin: true,
                currency: { select: { code: true } },
              },
            }),
            prisma.tradeOrder.findMany({
              where: { supplierCompanyId: authUser.companyId },
              orderBy: { createdAt: 'desc' },
              take: 100,
              select: {
                id: true,
                productName: true,
                totalAmount: true,
                currencyCode: true,
                status: true,
                shippingAddress: true,
                buyer: { select: { firstName: true, lastName: true, email: true } },
              },
            }),
            prisma.sampleOrder.findMany({
              where: { supplierCompanyId: authUser.companyId },
              orderBy: { createdAt: 'desc' },
              take: 100,
              select: {
                id: true,
                title: true,
                totalAmount: true,
                currencyCode: true,
                status: true,
                shippingAddress: true,
                buyer: { select: { firstName: true, lastName: true, email: true } },
              },
            }),
          ])
        : Promise.resolve([[], [], []] as const)

    const [policies, partners, [products, tradeOrders, sampleOrders]] = await Promise.all([
      policyQuery,
      partnerQuery,
      sourceQuery,
    ])

    return successResponse({
      items: policies.map(formatInsurancePolicy),
      partners,
      sources: {
        products: products.map((product) => ({
          ...product,
          priceMin: product.priceMin == null ? null : Number(product.priceMin),
          currencyCode: product.currency?.code || 'USD',
        })),
        tradeOrders: tradeOrders.map((order) => ({
          ...order,
          totalAmount: Number(order.totalAmount),
          buyerName: `${order.buyer.firstName} ${order.buyer.lastName}`.trim(),
        })),
        sampleOrders: sampleOrders.map((order) => ({
          ...order,
          totalAmount: Number(order.totalAmount),
          buyerName: `${order.buyer.firstName} ${order.buyer.lastName}`.trim(),
        })),
      },
    }, 'Insurance policies fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureServicePartnersSeeded()
    const authUser = await requireAuth(req)
    if (!isSupplier(authUser) && !isAdmin(authUser)) {
      throw new ApiError(403, 'Supplier access required')
    }

    const data = createSchema.parse(await req.json())
    const sourceCount = [data.productId, data.tradeOrderId, data.sampleOrderId].filter(Boolean).length
    if (sourceCount !== 1) {
      throw new ApiError(422, 'Exactly one insurance source is required')
    }

    let buyerId: string | null = null
    let companyId = authUser.companyId

    if (data.productId) {
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
        select: { id: true, companyId: true },
      })
      if (!product) throw new ApiError(404, 'Product not found')
      if (!isAdmin(authUser) && product.companyId !== authUser.companyId) {
        throw new ApiError(403, 'This product does not belong to your supplier account')
      }
      companyId = product.companyId
    }

    if (data.tradeOrderId) {
      const order = await prisma.tradeOrder.findUnique({
        where: { id: data.tradeOrderId },
        select: { id: true, buyerId: true, supplierCompanyId: true, totalAmount: true, currencyCode: true },
      })
      if (!order) throw new ApiError(404, 'Trade order not found')
      if (!isAdmin(authUser) && order.supplierCompanyId !== authUser.companyId) {
        throw new ApiError(403, 'This trade order does not belong to your supplier account')
      }
      buyerId = order.buyerId
      companyId = order.supplierCompanyId
    }

    if (data.sampleOrderId) {
      const order = await prisma.sampleOrder.findUnique({
        where: { id: data.sampleOrderId },
        select: { id: true, buyerId: true, supplierCompanyId: true, totalAmount: true, currencyCode: true },
      })
      if (!order) throw new ApiError(404, 'Sample order not found')
      if (!isAdmin(authUser) && order.supplierCompanyId !== authUser.companyId) {
        throw new ApiError(403, 'This sample order does not belong to your supplier account')
      }
      buyerId = order.buyerId
      companyId = order.supplierCompanyId
    }

    if (!companyId) throw new ApiError(422, 'Company required')
    if (data.startsAt && Number.isNaN(new Date(data.startsAt).getTime())) throw new ApiError(422, 'Invalid coverage start date')
    if (data.endsAt && Number.isNaN(new Date(data.endsAt).getTime())) throw new ApiError(422, 'Invalid coverage end date')
    if (data.startsAt && data.endsAt && new Date(data.startsAt) > new Date(data.endsAt)) {
      throw new ApiError(422, 'Coverage end date must be after the start date')
    }

    const selectedPartner = data.partnerId
      ? await prisma.servicePartner.findFirst({ where: { id: data.partnerId, type: 'INSURANCE', isActive: true } })
      : await getDefaultPartner('INSURANCE')

    if (data.partnerId && !selectedPartner) {
      throw new ApiError(404, 'Insurance partner not found')
    }

    const partnerId = 'id' in (selectedPartner || {}) ? selectedPartner?.id : null
    const providerName = 'name' in (selectedPartner || {}) ? selectedPartner?.name : data.providerName

    const policy = await prisma.insurancePolicy.create({
      data: {
        companyId,
        buyerId,
        productId: data.productId,
        tradeOrderId: data.tradeOrderId,
        sampleOrderId: data.sampleOrderId,
        partnerId,
        providerName: providerName || 'Insurance Partner',
        policyType: data.policyType,
        insuredAmount: data.insuredAmount,
        premiumAmount: data.premiumAmount,
        currencyCode: data.currencyCode,
        coverageSummary: data.coverageSummary,
        claimInstructions: data.claimInstructions,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        policyNumber: `POL-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        product: { select: { id: true, name: true, slug: true, sku: true, barcode: true, priceMin: true, currency: { select: { code: true } } } },
        partner: { select: { id: true, code: true, name: true, type: true, isDefault: true } },
        tradeOrder: { select: { id: true, productName: true, totalAmount: true, currencyCode: true, status: true } },
        sampleOrder: { select: { id: true, title: true, totalAmount: true, currencyCode: true, status: true } },
        claims: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (buyerId && buyerId !== authUser.userId) {
      try {
        await createNotification({
          userId: buyerId,
          type: 'INSURANCE_UPDATE',
          title: 'New insurance policy quoted',
          message: `${formatInsurancePolicy(policy).sourceLabel} now has insurance coverage from ${policy.providerName}.`,
          data: { insurancePolicyId: policy.id },
        })
      } catch (error) {
        console.error('Failed to create insurance policy notification:', error)
      }
    }

    return successResponse(formatInsurancePolicy(policy), 'Insurance quote created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
