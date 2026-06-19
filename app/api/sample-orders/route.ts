import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { createNotification } from '@/server/services/notification'
import { getPaginationParams, handleApiError, paginationMeta, successResponse } from '@/lib/utils/api'
import { createOneTimeCheckoutSession, createStripeCustomer } from '@/lib/payment/stripe'

const createSampleOrderSchema = z.object({
  productId: z.string().optional(),
  supplierCompanyId: z.string().optional(),
  title: z.string().optional(),
  quantity: z.number().positive().default(1),
  unit: z.string().optional(),
  samplePrice: z.number().nonnegative().optional(),
  shippingCost: z.number().nonnegative().default(0),
  currencyCode: z.string().default('USD'),
  shippingAddress: z.string().min(10),
  requirements: z.string().optional(),
  buyerNotes: z.string().optional(),
  paymentMethod: z.enum(['STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'MANUAL']).default('MANUAL'),
  transactionId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const where: Record<string, unknown> = {}

    if (authUser.roles.includes(ROLES.BUYER)) {
      where.buyerId = authUser.userId
    } else if (authUser.companyId && !authUser.roles.includes(ROLES.ADMIN) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      where.supplierCompanyId = authUser.companyId
    }

    const [orders, total] = await Promise.all([
      prisma.sampleOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, slug: true } },
          buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
          supplierCompany: { select: { id: true, name: true, slug: true } },
          payments: true,
          shipments: { include: { events: { orderBy: { eventTime: 'desc' }, take: 5 } } },
        },
      }),
      prisma.sampleOrder.count({ where }),
    ])

    return successResponse(orders, 'Sample orders fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (!authUser.roles.includes(ROLES.BUYER) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new ApiError(403, 'Buyer access required')
    }

    const data = createSampleOrderSchema.parse(await req.json())

    let supplierCompanyId = data.supplierCompanyId
    let title = data.title || 'Sample Request'
    let samplePrice = data.samplePrice ?? 0

    if (data.productId) {
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
        select: { id: true, name: true, companyId: true, priceMin: true, moqUnit: true },
      })
      if (!product) throw new ApiError(404, 'Product not found')
      supplierCompanyId = product.companyId
      title = data.title || `${product.name} Sample`
      samplePrice = data.samplePrice ?? Number(product.priceMin || 0)
    }

    if (!supplierCompanyId) throw new ApiError(400, 'Supplier company is required')
    const totalAmount = samplePrice + data.shippingCost

    const sampleOrder = await prisma.sampleOrder.create({
      data: {
        productId: data.productId,
        buyerId: authUser.userId,
        supplierCompanyId,
        title,
        quantity: data.quantity,
        unit: data.unit || 'PCS',
        samplePrice,
        shippingCost: data.shippingCost,
        totalAmount,
        currencyCode: data.currencyCode,
        shippingAddress: data.shippingAddress,
        requirements: data.requirements,
        buyerNotes: data.buyerNotes,
        status: data.paymentMethod === 'STRIPE' ? 'PENDING_PAYMENT' : 'PENDING_SUPPLIER_CONFIRMATION',
      },
    })

    if (data.paymentMethod === 'STRIPE') {
      const buyer = await prisma.user.findUnique({ where: { id: authUser.userId } })
      if (!buyer) throw new ApiError(404, 'Buyer not found')

      const stripeCustomerId = await createStripeCustomer(buyer.email, `${buyer.firstName} ${buyer.lastName}`)
      const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/buyer/sample-orders?payment=success`
      const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/buyer/sample-orders?payment=cancelled`
      const checkout = await createOneTimeCheckoutSession({
        customerId: stripeCustomerId,
        successUrl,
        cancelUrl,
        metadata: {
          kind: 'SAMPLE_ORDER',
          sampleOrderId: sampleOrder.id,
          buyerId: authUser.userId,
          supplierCompanyId,
        },
        lineItems: [
          {
            name: title,
            description: 'Sample order payment',
            amount: totalAmount,
            currency: data.currencyCode,
          },
        ],
      })

      await prisma.payment.create({
        data: {
          userId: authUser.userId,
          sampleOrderId: sampleOrder.id,
          amount: totalAmount,
          currency: data.currencyCode,
          method: 'STRIPE',
          status: 'PENDING',
          stripePaymentId: checkout.id,
          transactionId: data.transactionId,
          metadata: JSON.stringify({ sampleOrderId: sampleOrder.id, checkoutSessionId: checkout.id }),
        },
      })

      return successResponse({ sampleOrder, checkoutUrl: checkout.url }, 'Sample checkout session created', undefined, 201)
    }

    await prisma.payment.create({
      data: {
        userId: authUser.userId,
        sampleOrderId: sampleOrder.id,
        amount: totalAmount,
        currency: data.currencyCode,
        method: data.paymentMethod,
        status: 'PAID',
        transactionId: data.transactionId,
        metadata: JSON.stringify({ sampleOrderId: sampleOrder.id }),
      },
    })

    const company = await prisma.company.findUnique({
      where: { id: supplierCompanyId },
      include: { companyUsers: { where: { isPrimary: true }, select: { userId: true } } },
    })

    const supplierOwnerId = company?.companyUsers[0]?.userId
    if (supplierOwnerId) {
      await createNotification({
        userId: supplierOwnerId,
        type: 'SAMPLE_ORDER_UPDATE',
        title: 'New Sample Order',
        message: `A buyer requested a sample: ${title}.`,
        data: { sampleOrderId: sampleOrder.id },
      })
    }

    return successResponse(sampleOrder, 'Sample order created and paid', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
