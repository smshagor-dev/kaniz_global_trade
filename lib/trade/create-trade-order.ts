import prisma from '@/lib/db/prisma'
import { ApiError } from '@/lib/permissions'
import { calculateCommissionAmount, TRADE_COMMISSION_RATE } from '@/lib/commerce/revenue'

interface CreateTradeOrderInput {
  quotationId: string
  buyerId: string
  shippingAddress?: string
  buyerNotes?: string
}

export async function createTradeOrderFromQuotation(input: CreateTradeOrderInput) {
  const existing = await prisma.tradeOrder.findUnique({
    where: { quotationId: input.quotationId },
    include: { escrowAccount: true, shipments: true, disputes: true },
  })

  if (existing) return existing

  const quotation = await prisma.rFQQuotation.findUnique({
    where: { id: input.quotationId },
    include: {
      rfq: true,
      inquiry: true,
      items: true,
      company: true,
    },
  })

  if (!quotation) throw new ApiError(404, 'Quotation not found')
  if (quotation.buyerId !== input.buyerId) throw new ApiError(403, 'Access denied')
  if (quotation.status !== 'ACCEPTED') throw new ApiError(400, 'Only accepted quotations can create trade orders')

  const quantityFromRfq = quotation.rfq?.quantity ? Number(quotation.rfq.quantity) : NaN
  const quantityFromItems = quotation.items.reduce((sum, item) => sum + Number(item.quantity), 0)
  const quantity = Number.isFinite(quantityFromRfq) && quantityFromRfq > 0 ? quantityFromRfq : Math.max(quantityFromItems, 1)
  const unit = quotation.rfq?.unit || quotation.items[0]?.unit || 'PCS'
  const productName =
    quotation.rfq?.productName ||
    quotation.inquiry?.subject ||
    quotation.items[0]?.description ||
    'Trade Order'
  const subtotal = Number(quotation.totalPrice)
  const shippingCost = 0
  const escrowFee = Number((subtotal * 0.02).toFixed(2))
  const platformCommissionAmount = calculateCommissionAmount(subtotal, TRADE_COMMISSION_RATE)
  const totalAmount = subtotal + shippingCost + escrowFee

  return prisma.$transaction(async (tx) => {
    const order = await tx.tradeOrder.create({
      data: {
        quotationId: quotation.id,
        buyerId: input.buyerId,
        supplierCompanyId: quotation.companyId,
        productName,
        quantity,
        unit,
        unitPrice: quantity > 0 ? subtotal / quantity : subtotal,
        subtotal,
        shippingCost,
        escrowFee,
        platformCommissionRate: TRADE_COMMISSION_RATE,
        platformCommissionAmount,
        totalAmount,
        currencyCode: quotation.currencyCode,
        shippingAddress: input.shippingAddress,
        buyerNotes: input.buyerNotes,
        acceptedAt: quotation.acceptedAt || new Date(),
      },
    })

    await tx.escrowAccount.create({
      data: {
        tradeOrderId: order.id,
        buyerId: input.buyerId,
        supplierCompanyId: quotation.companyId,
        amountHeld: totalAmount,
        currencyCode: quotation.currencyCode,
        disputeDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    })

    await tx.platformCommission.create({
      data: {
        tradeOrderId: order.id,
        companyId: quotation.companyId,
        buyerId: input.buyerId,
        amount: platformCommissionAmount,
        rate: TRADE_COMMISSION_RATE,
        currencyCode: quotation.currencyCode,
      },
    })

    return tx.tradeOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { escrowAccount: true, shipments: true, disputes: true, commission: true },
    })
  })
}
