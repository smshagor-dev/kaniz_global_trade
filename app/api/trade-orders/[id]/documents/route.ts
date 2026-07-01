import { NextRequest } from 'next/server'
import { TradeDocumentType } from '@prisma/client'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { buildDocumentNumber, renderTradeDocumentHtml } from '@/lib/documents/generator'
import { FeeCalculationService } from '@/lib/finance/service-fees'

function canAccess(authUser: Awaited<ReturnType<typeof requireAuth>>, order: { buyerId: string; supplierCompanyId: string }) {
  return (
    order.buyerId === authUser.userId ||
    order.supplierCompanyId === authUser.companyId ||
    authUser.roles.includes(ROLES.SUPER_ADMIN) ||
    authUser.roles.includes(ROLES.ADMIN)
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const order = await prisma.tradeOrder.findUnique({
      where: { id },
      select: { buyerId: true, supplierCompanyId: true },
    })

    if (!order) throw new ApiError(404, 'Trade order not found')
    if (!canAccess(authUser, order)) throw new ApiError(403, 'Access denied')

    const documents = await prisma.tradeDocument.findMany({
      where: { tradeOrderId: id },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(documents, 'Trade documents fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const feeService = new FeeCalculationService()
    const { id } = await params
    const body = await req.json()
    const type = (body.type || 'PROFORMA_INVOICE') as TradeDocumentType
    if (!Object.values(TradeDocumentType).includes(type)) {
      throw new ApiError(400, 'Invalid trade document type')
    }

    const order = await prisma.tradeOrder.findUnique({
      where: { id },
      include: {
        buyer: { select: { firstName: true, lastName: true, email: true } },
        supplierCompany: {
          select: { name: true, address: true, email: true, phone: true, country: { select: { name: true } } },
        },
        shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (!order) throw new ApiError(404, 'Trade order not found')
    if (!canAccess(authUser, order)) throw new ApiError(403, 'Access denied')

    const documentNo = buildDocumentNumber(type.slice(0, 3), order.id)
    const payload = {
      documentNo,
      type,
      issueDate: new Date().toISOString().slice(0, 10),
      currencyCode: order.currencyCode,
      buyer: {
        name: `${order.buyer.firstName} ${order.buyer.lastName}`.trim(),
        email: order.buyer.email,
        address: order.shippingAddress,
      },
      supplier: {
        name: order.supplierCompany.name,
        address: order.supplierCompany.address,
        country: order.supplierCompany.country?.name,
        email: order.supplierCompany.email,
        phone: order.supplierCompany.phone,
      },
      shipment: order.shipments[0]
        ? {
            carrier: order.shipments[0].carrier,
            trackingNumber: order.shipments[0].trackingNumber,
            awbNumber: order.shipments[0].awbNumber,
            serviceLevel: order.shipments[0].serviceLevel,
          }
        : undefined,
      lineItems: [
        {
          name: order.productName,
          quantity: Number(order.quantity),
          unit: order.unit,
          unitPrice: order.unitPrice ? Number(order.unitPrice) : null,
          amount: Number(order.subtotal),
        },
      ],
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      escrowFee: Number(order.escrowFee),
      totalAmount: Number(order.totalAmount),
      notes: order.buyerNotes || order.supplierNotes,
    }

    const html = renderTradeDocumentHtml(payload)
    const feeCodeMap: Record<string, string> = {
      COMMERCIAL_INVOICE: 'TRADE_DOCUMENT_COMMERCIAL_INVOICE',
      PACKING_LIST: 'TRADE_DOCUMENT_PACKING_LIST',
    }
    const feeCode = feeCodeMap[type] || 'TRADE_DOCUMENT_EXPORT_DOCUMENT'
    const feeResult = await feeService.calculateFee(feeCode, Number(order.subtotal))
    const revenueLedger = await feeService.createRevenueLedger({
      sourceType: 'TRADE_DOCUMENT_SERVICE',
      sourceId: `${order.id}:${type}`,
      userId: authUser.userId,
      companyId: order.supplierCompanyId,
      orderId: order.id,
      tradeOrderId: order.id,
      grossAmount: Number(order.subtotal),
      feeAmount: feeResult.feeAmount,
      netAmount: feeResult.feeAmount,
      currency: order.currencyCode,
      refundableAmount: feeResult.feeAmount,
      nonRefundableAmount: 0,
    })
    const snapshot = await feeService.createFeeSnapshot({
      code: feeResult.code,
      sourceType: 'TRADE_DOCUMENT_SERVICE',
      sourceId: `${order.id}:${type}`,
      userId: authUser.userId,
      companyId: order.supplierCompanyId,
      orderId: order.id,
      tradeOrderId: order.id,
      serviceFeeSettingId: feeResult.serviceFeeSettingId,
      revenueLedgerId: revenueLedger.id,
      baseAmount: Number(order.subtotal),
      feeAmount: feeResult.feeAmount,
      totalAmount: feeResult.feeAmount,
      currency: order.currencyCode,
      calculationData: { ...feeResult, type },
    })

    const [created] = await prisma.$transaction([
      prisma.tradeDocument.create({
        data: {
          tradeOrderId: order.id,
          type,
          documentNo,
          title: type.replace(/_/g, ' '),
          payload: JSON.stringify(payload),
          html,
          createdById: authUser.userId,
        },
      }),
      prisma.tradeDocumentRequest.create({
        data: {
          userId: authUser.userId,
          companyId: order.supplierCompanyId,
          tradeOrderId: order.id,
          documentType: type,
          serviceFeeSettingId: feeResult.serviceFeeSettingId,
          revenueLedgerId: revenueLedger.id,
          snapshotId: snapshot.id,
          paymentStatus: 'PAID',
          requestStatus: 'COMPLETED',
          feeAmount: feeResult.feeAmount,
          taxAmount: 0,
          totalAmount: feeResult.feeAmount,
          currency: order.currencyCode,
        },
      }),
    ])

    return successResponse(created, 'Trade document generated', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
