import { randomBytes } from 'node:crypto'
import { NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError, isAdmin, isSupplier } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { listAvailableLogisticsProviders } from '@/lib/shipping/providers'
import { createNotification } from '@/server/services/notification'
import {
  buildLogisticsVerificationUrl,
  formatLogisticsBooking,
  type LogisticsMetadata,
} from '@/lib/logistics/booking'

const createSchema = z.object({
  tradeOrderId: z.string().optional(),
  sampleOrderId: z.string().optional(),
  productId: z.string().optional(),
  providerName: z.string().min(2),
  serviceMode: z.string().default('AIR_FREIGHT'),
  origin: z.string().min(2),
  destination: z.string().min(2),
  quotedCost: z.number().nonnegative(),
  currencyCode: z.string().default('USD'),
  estimatedDeliveryAt: z.string().optional(),
  cargoReadyAt: z.string().optional(),
  productQuantity: z.number().positive().optional(),
  productUnit: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const where: Record<string, unknown> = {}
    const isUserAdmin = isAdmin(authUser)
    const isUserSupplier = isSupplier(authUser)

    if (authUser.roles.includes(ROLES.BUYER)) where.buyerId = authUser.userId
    else if (authUser.companyId && !isUserAdmin) where.companyId = authUser.companyId

    const bookingQuery = prisma.logisticsBooking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        tradeOrder: { select: { id: true, productName: true } },
        sampleOrder: { select: { id: true, title: true } },
      },
    })

    const providerQuery = listAvailableLogisticsProviders()

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
                sku: true,
                barcode: true,
                moq: true,
                moqUnit: true,
                priceMin: true,
                leadTime: true,
                productionCapacity: true,
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
                quantity: true,
                unit: true,
                totalAmount: true,
                currencyCode: true,
                shippingAddress: true,
                status: true,
                buyer: { select: { firstName: true, lastName: true, email: true } },
                quotation: {
                  select: {
                    inquiry: {
                      select: {
                        product: { select: { id: true, name: true, sku: true, barcode: true } },
                      },
                    },
                  },
                },
              },
            }),
            prisma.sampleOrder.findMany({
              where: { supplierCompanyId: authUser.companyId },
              orderBy: { createdAt: 'desc' },
              take: 100,
              select: {
                id: true,
                title: true,
                quantity: true,
                unit: true,
                totalAmount: true,
                currencyCode: true,
                shippingAddress: true,
                status: true,
                product: { select: { id: true, name: true, sku: true, barcode: true } },
                buyer: { select: { firstName: true, lastName: true, email: true } },
              },
            }),
          ])
        : Promise.resolve([[], [], []] as const)

    const [bookings, providers, [products, tradeOrders, sampleOrders]] = await Promise.all([
      bookingQuery,
      providerQuery,
      sourceQuery,
    ])

    return successResponse(
      {
        items: bookings.map(formatLogisticsBooking),
        providers,
        sources: {
          products: products.map((product) => ({
            ...product,
            moq: product.moq == null ? null : Number(product.moq),
            priceMin: product.priceMin == null ? null : Number(product.priceMin),
            currencyCode: product.currency?.code || 'USD',
          })),
          tradeOrders: tradeOrders.map((order) => ({
            ...order,
            quantity: Number(order.quantity),
            totalAmount: Number(order.totalAmount),
            buyerName: `${order.buyer.firstName} ${order.buyer.lastName}`.trim(),
            product: order.quotation?.inquiry?.product || null,
          })),
          sampleOrders: sampleOrders.map((order) => ({
            ...order,
            quantity: Number(order.quantity),
            totalAmount: Number(order.totalAmount),
            buyerName: `${order.buyer.firstName} ${order.buyer.lastName}`.trim(),
          })),
        },
      },
      'Logistics bookings fetched'
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (!isSupplier(authUser) && !isAdmin(authUser)) {
      throw new ApiError(403, 'Supplier access required')
    }

    const data = createSchema.parse(await req.json())
    let buyerId = authUser.userId
    let companyId = authUser.companyId
    let sourceType: LogisticsMetadata['sourceType'] = 'MANUAL'
    let productMetadata: LogisticsMetadata['product']
    let orderSnapshot: LogisticsMetadata['orderSnapshot']
    let barcodeValue: string | null = null
    let barcodeSource: string | null = null

    if (data.productId) {
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          companyId: true,
          moqUnit: true,
        },
      })

      if (!product) throw new ApiError(404, 'Product not found')
      if (!isAdmin(authUser) && product.companyId !== authUser.companyId) {
        throw new ApiError(403, 'This product does not belong to your supplier account')
      }

      companyId = product.companyId
      sourceType = 'PRODUCT'
      productMetadata = {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        quantity: data.productQuantity ?? null,
        unit: data.productUnit || product.moqUnit || null,
      }
      barcodeValue = product.barcode || null
      barcodeSource = product.barcode ? 'PRODUCT_BARCODE' : null
    }

    if (data.tradeOrderId) {
      const order = await prisma.tradeOrder.findUnique({
        where: { id: data.tradeOrderId },
        select: {
          id: true,
          buyerId: true,
          supplierCompanyId: true,
          productName: true,
          quantity: true,
          unit: true,
          shippingAddress: true,
          quotation: {
            select: {
              inquiry: {
                select: {
                  product: { select: { id: true, name: true, sku: true, barcode: true } },
                },
              },
            },
          },
        },
      })
      if (!order) throw new ApiError(404, 'Trade order not found')
      if (!isAdmin(authUser) && order.supplierCompanyId !== authUser.companyId) {
        throw new ApiError(403, 'This trade order does not belong to your supplier account')
      }

      buyerId = order.buyerId
      companyId = order.supplierCompanyId
      sourceType = 'TRADE_ORDER'
      orderSnapshot = {
        id: order.id,
        label: order.productName,
        quantity: Number(order.quantity),
        unit: order.unit,
        shippingAddress: order.shippingAddress,
      }

      const linkedProduct = order.quotation?.inquiry?.product
      if (linkedProduct) {
        productMetadata = {
          id: linkedProduct.id,
          name: linkedProduct.name,
          sku: linkedProduct.sku,
          barcode: linkedProduct.barcode,
          quantity: data.productQuantity ?? Number(order.quantity),
          unit: data.productUnit || order.unit || null,
        }
        barcodeValue = linkedProduct.barcode || null
        barcodeSource = linkedProduct.barcode ? 'TRADE_ORDER_PRODUCT_BARCODE' : null
      }
    }

    if (data.sampleOrderId) {
      const order = await prisma.sampleOrder.findUnique({
        where: { id: data.sampleOrderId },
        select: {
          id: true,
          buyerId: true,
          supplierCompanyId: true,
          title: true,
          quantity: true,
          unit: true,
          shippingAddress: true,
          product: { select: { id: true, name: true, sku: true, barcode: true } },
        },
      })
      if (!order) throw new ApiError(404, 'Sample order not found')
      if (!isAdmin(authUser) && order.supplierCompanyId !== authUser.companyId) {
        throw new ApiError(403, 'This sample order does not belong to your supplier account')
      }

      buyerId = order.buyerId
      companyId = order.supplierCompanyId
      sourceType = 'SAMPLE_ORDER'
      orderSnapshot = {
        id: order.id,
        label: order.title,
        quantity: Number(order.quantity),
        unit: order.unit,
        shippingAddress: order.shippingAddress,
      }

      if (order.product) {
        productMetadata = {
          id: order.product.id,
          name: order.product.name,
          sku: order.product.sku,
          barcode: order.product.barcode,
          quantity: data.productQuantity ?? Number(order.quantity),
          unit: data.productUnit || order.unit || null,
        }
        barcodeValue = order.product.barcode || barcodeValue
        barcodeSource = order.product.barcode ? 'SAMPLE_ORDER_PRODUCT_BARCODE' : barcodeSource
      }
    }

    if (!companyId) throw new ApiError(422, 'Company required')

    const providers = await listAvailableLogisticsProviders()
    const verificationToken = randomBytes(18).toString('hex')
    const verificationUrl = buildLogisticsVerificationUrl(verificationToken)
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 280,
      color: {
        dark: '#1f2937',
        light: '#FFFFFF',
      },
    })

    const booking = await prisma.logisticsBooking.create({
      data: {
        companyId,
        buyerId,
        tradeOrderId: data.tradeOrderId,
        sampleOrderId: data.sampleOrderId,
        providerName: data.providerName,
        serviceMode: data.serviceMode,
        origin: data.origin,
        destination: data.destination,
        quotedCost: data.quotedCost,
        currencyCode: data.currencyCode,
        estimatedDeliveryAt: data.estimatedDeliveryAt ? new Date(data.estimatedDeliveryAt) : null,
        notes: data.notes,
        bookingReference: `LGT-${Date.now()}`,
        metadata: JSON.stringify({
          hasTrackingCredentials: providers.find((item) => item.name === data.providerName.toUpperCase())?.hasCredentials ?? false,
          sourceType,
          product: productMetadata,
          orderSnapshot,
          cargoReadyAt: data.cargoReadyAt || null,
          createdByRole: isAdmin(authUser) ? 'ADMIN' : authUser.roles.includes(ROLES.BUYER) ? 'BUYER' : 'SUPPLIER',
          isSelfManagedCargo: sourceType === 'PRODUCT' && !data.tradeOrderId && !data.sampleOrderId,
          verificationToken,
          verificationUrl,
          qrCodeDataUrl,
          barcodeValue,
          barcodeSource,
        } satisfies LogisticsMetadata),
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        tradeOrder: { select: { id: true, productName: true } },
        sampleOrder: { select: { id: true, title: true } },
      },
    })

    if (buyerId !== authUser.userId) {
      await createNotification({
        userId: buyerId,
        type: 'LOGISTICS_UPDATE',
        title: 'New Logistics Booking',
        message: `A supplier created a ${data.providerName} logistics booking for ${formatLogisticsBooking(booking).sourceLabel}.`,
        data: { logisticsBookingId: booking.id, verificationUrl },
      })
    }

    return successResponse(formatLogisticsBooking(booking), 'Logistics quote created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
