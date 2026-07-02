import prisma from '@/lib/db/prisma'
import { ApiError } from '@/lib/permissions'
import {
  FeeApplicationStatus,
  FeeType,
  PayoutLedgerStatus,
  Prisma,
  RevenueLedgerStatus,
  RevenueType,
  ServiceRequestStatus,
  TaxApplicationMode,
} from '@prisma/client'

type DbClient = Prisma.TransactionClient | typeof prisma

export interface CalculatedFeeResult {
  code: string
  name: string
  category: string
  feeType: FeeType
  currency: string
  baseAmount: number
  feeValue: number
  feeAmount: number
  minFee: number | null
  maxFee: number | null
  appliesTo: string
  isActive: boolean
  serviceFeeSettingId: string
  version: number
}

export interface CalculatedTaxResult {
  taxSettingId: string | null
  taxName: string | null
  taxRate: number
  taxAmount: number
  totalAmount: number
  applicationMode: TaxApplicationMode | null
}

export interface TradeOrderFinancialBreakdownInput {
  subtotal: number
  shippingCost?: number
  escrowFee?: number
  platformCommissionAmount?: number
}

export interface TradeOrderFinancialBreakdown {
  grossOrderAmount: number
  buyerEscrowFundingTotal: number
  supplierNetReceivable: number
  platformRetainedTotal: number
}

export interface RevenueLedgerInput {
  sourceType: string
  sourceId: string
  userId?: string | null
  companyId?: string | null
  orderId?: string | null
  tradeOrderId?: string | null
  sampleOrderId?: string | null
  paymentId?: string | null
  grossAmount: number
  feeAmount: number
  netAmount: number
  currency: string
  status?: RevenueLedgerStatus
  revenueType?: RevenueType
  refundableAmount?: number
  nonRefundableAmount?: number
  taxAmount?: number
  taxSettingId?: string | null
  parentLedgerId?: string | null
  notes?: string | null
}

export interface FeeSnapshotInput {
  code: string
  sourceType: string
  sourceId: string
  userId?: string | null
  companyId?: string | null
  orderId?: string | null
  tradeOrderId?: string | null
  sampleOrderId?: string | null
  paymentId?: string | null
  serviceFeeSettingId?: string | null
  revenueLedgerId?: string | null
  baseAmount: number
  feeAmount: number
  taxAmount?: number
  totalAmount: number
  currency: string
  calculationData: Record<string, unknown>
}

export interface TaxSnapshotInput {
  sourceType: string
  sourceId: string
  userId?: string | null
  paymentId?: string | null
  revenueLedgerId?: string | null
  taxSettingId?: string | null
  baseAmount: number
  feeAmount?: number
  taxAmount: number
  totalAmount: number
  currency: string
  snapshotData: Record<string, unknown>
}

function asNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0
  return Number(value)
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

function applyFeeBounds(amount: number, minFee?: number | null, maxFee?: number | null) {
  let next = amount
  if (typeof minFee === 'number') next = Math.max(next, minFee)
  if (typeof maxFee === 'number') next = Math.min(next, maxFee)
  return roundMoney(next)
}

export function calculateTradeOrderFinancialBreakdown(input: TradeOrderFinancialBreakdownInput): TradeOrderFinancialBreakdown {
  const grossOrderAmount = roundMoney(input.subtotal + (input.shippingCost ?? 0))
  const buyerEscrowFundingTotal = roundMoney(grossOrderAmount + (input.escrowFee ?? 0))
  const supplierNetReceivable = roundMoney(grossOrderAmount - (input.platformCommissionAmount ?? 0))
  const platformRetainedTotal = roundMoney(buyerEscrowFundingTotal - supplierNetReceivable)

  return {
    grossOrderAmount,
    buyerEscrowFundingTotal,
    supplierNetReceivable,
    platformRetainedTotal,
  }
}

export function calculateFeeAmount(
  feeType: FeeType,
  feeValue: number,
  baseAmount: number,
  minFee?: number | null,
  maxFee?: number | null
) {
  if (baseAmount < 0) throw new ApiError(422, 'Base amount cannot be negative')
  if (feeValue < 0) throw new ApiError(422, 'Fee value cannot be negative')
  if (feeType === FeeType.PERCENTAGE && feeValue > 100) {
    throw new ApiError(422, 'Percentage fee cannot exceed 100')
  }

  const raw =
    feeType === FeeType.PERCENTAGE
      ? (baseAmount * feeValue) / 100
      : feeType === FeeType.FIXED
        ? feeValue
        : 0

  return applyFeeBounds(roundMoney(raw), minFee ?? null, maxFee ?? null)
}

export class FeeCalculationService {
  constructor(private readonly db: DbClient = prisma) {}

  async getActiveFee(code: string) {
    const fee = await this.db.serviceFeeSetting.findUnique({
      where: { code },
      include: { category: true },
    })

    if (!fee || !fee.isActive || fee.status !== FeeApplicationStatus.ACTIVE) {
      throw new ApiError(404, `Active service fee "${code}" not found`)
    }

    return fee
  }

  async calculateFee(code: string, baseAmount: number): Promise<CalculatedFeeResult> {
    const fee = await this.getActiveFee(code)
    const feeValue = asNumber(fee.feeValue)
    const minFee = fee.minFee == null ? null : asNumber(fee.minFee)
    const maxFee = fee.maxFee == null ? null : asNumber(fee.maxFee)
    const feeAmount = calculateFeeAmount(fee.feeType, feeValue, baseAmount, minFee, maxFee)

    return {
      code: fee.code,
      name: fee.name,
      category: fee.category.code,
      feeType: fee.feeType,
      currency: fee.currency,
      baseAmount: roundMoney(baseAmount),
      feeValue,
      feeAmount,
      minFee,
      maxFee,
      appliesTo: fee.appliesTo,
      isActive: fee.isActive,
      serviceFeeSettingId: fee.id,
      version: fee.version,
    }
  }

  async calculateTaxVat(
    amount: number,
    country: string | null | undefined,
    serviceType: string,
    options?: { stateRegion?: string | null; appliesTo?: 'BUYER' | 'SUPPLIER' | 'SERVICE_FEE' | 'SUBSCRIPTION' }
  ): Promise<CalculatedTaxResult> {
    if (!country) {
      return {
        taxSettingId: null,
        taxName: null,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: roundMoney(amount),
        applicationMode: null,
      }
    }

    const rules = await this.db.taxVatSetting.findMany({
      where: {
        isActive: true,
        country,
      },
      orderBy: [{ stateRegion: 'desc' }, { updatedAt: 'desc' }],
    })

    const rule =
      rules.find((item) => (options?.stateRegion ? item.stateRegion === options.stateRegion : !item.stateRegion)) ||
      rules[0]

    if (!rule) {
      return {
        taxSettingId: null,
        taxName: null,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: roundMoney(amount),
        applicationMode: null,
      }
    }

    const appliesTo = options?.appliesTo ?? 'SERVICE_FEE'
    const allowed =
      (appliesTo === 'BUYER' && rule.appliesToBuyer) ||
      (appliesTo === 'SUPPLIER' && rule.appliesToSupplier) ||
      (appliesTo === 'SUBSCRIPTION' && rule.appliesToSubscription) ||
      (appliesTo === 'SERVICE_FEE' && rule.appliesToServiceFee)

    if (!allowed) {
      return {
        taxSettingId: rule.id,
        taxName: rule.taxName,
        taxRate: asNumber(rule.taxRate),
        taxAmount: 0,
        totalAmount: roundMoney(amount),
        applicationMode: rule.applicationMode,
      }
    }

    const taxRate = asNumber(rule.taxRate)
    const taxAmount =
      rule.applicationMode === TaxApplicationMode.INCLUSIVE
        ? roundMoney(amount - amount / (1 + taxRate / 100))
        : roundMoney((amount * taxRate) / 100)

    return {
      taxSettingId: rule.id,
      taxName: `${rule.taxName} for ${serviceType}`,
      taxRate,
      taxAmount,
      totalAmount:
        rule.applicationMode === TaxApplicationMode.INCLUSIVE
          ? roundMoney(amount)
          : roundMoney(amount + taxAmount),
      applicationMode: rule.applicationMode,
    }
  }

  calculateEscrowFee(amount: number) {
    return this.calculateFee('ESCROW_SERVICE_FEE', amount)
  }

  calculateShippingCommission(amount: number) {
    return this.calculateFee('SHIPPING_COMMISSION', amount)
  }

  async calculateSupplierPayout(orderId: string) {
    const order = await this.db.tradeOrder.findUnique({
      where: { id: orderId },
      include: {
        supplierCompany: {
          include: {
            companyUsers: {
              where: { isPrimary: true },
              select: { userId: true },
            },
          },
        },
        shippingCommissions: true,
      },
    })

    if (!order) throw new ApiError(404, 'Trade order not found')

    const platformFee = asNumber(order.platformCommissionAmount)
    const escrowFee = asNumber(order.escrowFee)
    const breakdown = calculateTradeOrderFinancialBreakdown({
      subtotal: asNumber(order.subtotal),
      shippingCost: asNumber(order.shippingCost),
      escrowFee,
      platformCommissionAmount: platformFee,
    })
    const shippingFee = order.shippingCommissions.reduce((sum, item) => sum + asNumber(item.commissionAmount), 0)
    const otherDeduction = 0
    const netPayoutAmount = roundMoney(breakdown.supplierNetReceivable - otherDeduction)

    return {
      supplierId: order.supplierCompany.companyUsers[0]?.userId || null,
      companyId: order.supplierCompanyId,
      tradeOrderId: order.id,
      orderId: order.id,
      grossOrderAmount: breakdown.grossOrderAmount,
      platformFee,
      escrowFee,
      shippingFee: roundMoney(shippingFee),
      otherDeduction,
      netPayoutAmount,
      currency: order.currencyCode,
    }
  }

  async calculateOrderProfit(orderId: string) {
    const order = await this.db.tradeOrder.findUnique({
      where: { id: orderId },
      include: {
        shippingCommissions: true,
      },
    })

    if (!order) throw new ApiError(404, 'Trade order not found')

    const transactionFee = asNumber(order.platformCommissionAmount)
    const escrowFee = asNumber(order.escrowFee)
    const breakdown = calculateTradeOrderFinancialBreakdown({
      subtotal: asNumber(order.subtotal),
      shippingCost: asNumber(order.shippingCost),
      escrowFee,
      platformCommissionAmount: transactionFee,
    })
    const shippingCommission = order.shippingCommissions.reduce((sum, item) => sum + asNumber(item.platformProfit), 0)
    const totalProfit = roundMoney(transactionFee + escrowFee + shippingCommission)

    return {
      orderId: order.id,
      orderValue: breakdown.grossOrderAmount,
      transactionFee,
      escrowFee,
      shippingCommission: roundMoney(shippingCommission),
      totalProfit,
      supplierPayout: breakdown.supplierNetReceivable,
      currency: order.currencyCode,
    }
  }

  async createRevenueLedger(data: RevenueLedgerInput) {
    return this.db.platformRevenueLedger.create({
      data: {
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        userId: data.userId ?? null,
        companyId: data.companyId ?? null,
        orderId: data.orderId ?? null,
        tradeOrderId: data.tradeOrderId ?? null,
        sampleOrderId: data.sampleOrderId ?? null,
        paymentId: data.paymentId ?? null,
        grossAmount: roundMoney(data.grossAmount),
        feeAmount: roundMoney(data.feeAmount),
        netAmount: roundMoney(data.netAmount),
        currency: data.currency,
        status: data.status ?? RevenueLedgerStatus.POSTED,
        revenueType: data.revenueType ?? RevenueType.CREDIT,
        refundableAmount: roundMoney(data.refundableAmount ?? data.netAmount),
        nonRefundableAmount: roundMoney(data.nonRefundableAmount ?? 0),
        taxAmount: roundMoney(data.taxAmount ?? 0),
        taxSettingId: data.taxSettingId ?? null,
        parentLedgerId: data.parentLedgerId ?? null,
        notes: data.notes ?? null,
      },
    })
  }

  async createFeeSnapshot(data: FeeSnapshotInput) {
    return this.db.feeCalculationSnapshot.create({
      data: {
        code: data.code,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        userId: data.userId ?? null,
        companyId: data.companyId ?? null,
        orderId: data.orderId ?? null,
        tradeOrderId: data.tradeOrderId ?? null,
        sampleOrderId: data.sampleOrderId ?? null,
        paymentId: data.paymentId ?? null,
        serviceFeeSettingId: data.serviceFeeSettingId ?? null,
        revenueLedgerId: data.revenueLedgerId ?? null,
        baseAmount: roundMoney(data.baseAmount),
        feeAmount: roundMoney(data.feeAmount),
        taxAmount: roundMoney(data.taxAmount ?? 0),
        totalAmount: roundMoney(data.totalAmount),
        currency: data.currency,
        calculationData: JSON.stringify(data.calculationData),
      },
    })
  }

  async createTaxSnapshot(data: TaxSnapshotInput) {
    return this.db.taxCalculationSnapshot.create({
      data: {
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        userId: data.userId ?? null,
        paymentId: data.paymentId ?? null,
        revenueLedgerId: data.revenueLedgerId ?? null,
        taxSettingId: data.taxSettingId ?? null,
        baseAmount: roundMoney(data.baseAmount),
        feeAmount: roundMoney(data.feeAmount ?? 0),
        taxAmount: roundMoney(data.taxAmount),
        totalAmount: roundMoney(data.totalAmount),
        currency: data.currency,
        snapshotData: JSON.stringify(data.snapshotData),
      },
    })
  }

  async createRevenueReversalLedger(input: {
    originalLedgerId: string
    createdById?: string | null
    paymentId?: string | null
    refundRequestId?: string | null
    chargebackCaseId?: string | null
    reason?: string | null
  }) {
    const original = await this.db.platformRevenueLedger.findUnique({
      where: { id: input.originalLedgerId },
    })

    if (!original) throw new ApiError(404, 'Revenue ledger not found')

    const reversal = await this.createRevenueLedger({
      sourceType: original.sourceType,
      sourceId: original.sourceId,
      userId: original.userId,
      companyId: original.companyId,
      orderId: original.orderId,
      tradeOrderId: original.tradeOrderId,
      sampleOrderId: original.sampleOrderId,
      paymentId: input.paymentId ?? original.paymentId,
      grossAmount: -asNumber(original.grossAmount),
      feeAmount: -asNumber(original.feeAmount),
      netAmount: -asNumber(original.netAmount),
      currency: original.currency,
      status: RevenueLedgerStatus.POSTED,
      revenueType: RevenueType.REVERSAL,
      refundableAmount: 0,
      nonRefundableAmount: 0,
      taxAmount: -asNumber(original.taxAmount),
      taxSettingId: original.taxSettingId,
      parentLedgerId: original.id,
      notes: input.reason ?? 'Revenue reversal',
    })

    await this.db.revenueReversalLedger.create({
      data: {
        originalLedgerId: original.id,
        reversalLedgerId: reversal.id,
        paymentId: input.paymentId ?? original.paymentId,
        refundRequestId: input.refundRequestId ?? null,
        chargebackCaseId: input.chargebackCaseId ?? null,
        companyId: original.companyId,
        createdById: input.createdById ?? null,
        amount: roundMoney(Math.abs(asNumber(original.netAmount))),
        currency: original.currency,
        reason: input.reason ?? null,
      },
    })

    await this.db.platformRevenueLedger.update({
      where: { id: original.id },
      data: { status: RevenueLedgerStatus.REVERSED },
    })

    return reversal
  }

  async calculateDisputeFee(disputeId: string) {
    const dispute = await this.db.disputeCase.findUnique({
      where: { id: disputeId },
      include: { tradeOrder: true },
    })

    if (!dispute) throw new ApiError(404, 'Dispute case not found')
    const baseAmount = asNumber(dispute.tradeOrder?.subtotal ?? 0)
    return this.calculateFee('DISPUTE_RESOLUTION_FEE', baseAmount)
  }

  async calculateRefundAmount(paymentId: string) {
    const payment = await this.db.payment.findUnique({
      where: { id: paymentId },
      include: {
        platformRevenueLedgers: true,
      },
    })

    if (!payment) throw new ApiError(404, 'Payment not found')

    const originalPaidAmount = asNumber(payment.amount)
    const activeRevenue = payment.platformRevenueLedgers.find((item) => item.revenueType === RevenueType.CREDIT)
    const nonRefundableAmount = activeRevenue?.nonRefundableAmount ? asNumber(activeRevenue.nonRefundableAmount) : 0
    const refundableAmount = roundMoney(Math.max(0, originalPaidAmount - nonRefundableAmount))

    return {
      paymentId,
      originalPaidAmount,
      refundableAmount,
      nonRefundablePlatformFee: nonRefundableAmount,
      paymentGatewayFeeLoss: 0,
      supplierPayoutAdjustment: 0,
      currency: payment.currency,
    }
  }

  async calculateChargebackImpact(chargebackId: string) {
    const caseRow = await this.db.chargebackCase.findUnique({
      where: { id: chargebackId },
      include: { payment: true },
    })

    if (!caseRow) throw new ApiError(404, 'Chargeback case not found')

    return {
      chargebackId,
      originalPaidAmount: asNumber(caseRow.originalPaidAmount),
      refundableAmount: asNumber(caseRow.refundableAmount),
      nonRefundablePlatformFee: asNumber(caseRow.nonRefundableFee),
      paymentGatewayFeeLoss: asNumber(caseRow.gatewayFeeLoss),
      supplierPayoutAdjustment: asNumber(caseRow.supplierAdjustment),
      currency: caseRow.currency,
    }
  }

  async createTradeOrderFinancials(input: {
    tradeOrderId: string
    buyerId: string
    companyId: string
    paymentId?: string | null
  }) {
    const payout = await this.calculateSupplierPayout(input.tradeOrderId)
    if (!payout.supplierId) {
      throw new ApiError(422, 'Supplier payout owner is not configured')
    }

    const order = await this.db.tradeOrder.findUnique({
      where: { id: input.tradeOrderId },
    })
    if (!order) throw new ApiError(404, 'Trade order not found')

    const revenueLedger = await this.createRevenueLedger({
      sourceType: 'TRADE_ORDER_TRANSACTION_FEE',
      sourceId: input.tradeOrderId,
      userId: input.buyerId,
      companyId: input.companyId,
      orderId: input.tradeOrderId,
      tradeOrderId: input.tradeOrderId,
      paymentId: input.paymentId ?? null,
      grossAmount: payout.grossOrderAmount,
      feeAmount: payout.platformFee,
      netAmount: payout.platformFee,
      currency: payout.currency,
      refundableAmount: payout.platformFee,
      nonRefundableAmount: 0,
    })

    const supplierPayout = await this.db.supplierPayoutLedger.create({
      data: {
        supplierId: payout.supplierId,
        companyId: payout.companyId,
        orderId: payout.orderId,
        tradeOrderId: payout.tradeOrderId,
        paymentId: input.paymentId ?? null,
        revenueLedgerId: revenueLedger.id,
        grossOrderAmount: payout.grossOrderAmount,
        platformFee: payout.platformFee,
        escrowFee: payout.escrowFee,
        shippingFee: payout.shippingFee,
        otherDeduction: payout.otherDeduction,
        netPayoutAmount: payout.netPayoutAmount,
        payoutStatus: PayoutLedgerStatus.PENDING,
        currency: payout.currency,
      },
    })

    return { revenueLedger, supplierPayout, order }
  }
}

export const feeCalculationService = new FeeCalculationService()
