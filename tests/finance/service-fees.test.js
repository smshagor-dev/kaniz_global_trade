const test = require('node:test')
const assert = require('node:assert/strict')
const { FeeType } = require('@prisma/client')
const { calculateFeeAmount, FeeCalculationService } = require('../../lib/finance/service-fees')

test('percentage fee calculation applies percentage correctly', () => {
  assert.equal(calculateFeeAmount(FeeType.PERCENTAGE, 2, 50000), 1000)
})

test('fixed fee calculation returns configured fixed value', () => {
  assert.equal(calculateFeeAmount(FeeType.FIXED, 30, 50000), 30)
})

test('min and max fee bounds are respected', () => {
  assert.equal(calculateFeeAmount(FeeType.PERCENTAGE, 1, 100, 5, 25), 5)
  assert.equal(calculateFeeAmount(FeeType.PERCENTAGE, 20, 1000, 5, 25), 25)
})

test('disabled fee cannot be applied', async () => {
  const service = new FeeCalculationService({
    serviceFeeSetting: {
      findUnique: async () => ({
        id: 'fee-1',
        code: 'TRANSACTION_SERVICE_FEE',
        name: 'Transaction Service Fee',
        category: { code: 'TRANSACTION' },
        feeType: FeeType.PERCENTAGE,
        feeValue: 2,
        minFee: null,
        maxFee: null,
        currency: 'USD',
        appliesTo: 'TRADE_ORDER',
        isActive: false,
        status: 'INACTIVE',
        version: 1,
      }),
    },
  })

  await assert.rejects(() => service.calculateFee('TRANSACTION_SERVICE_FEE', 1000))
})

test('supplier payout calculation deducts platform fee from gross order amount', async () => {
  const service = new FeeCalculationService({
    tradeOrder: {
      findUnique: async () => ({
        id: 'order-1',
        subtotal: 50000,
        platformCommissionAmount: 1000,
        escrowFee: 300,
        currencyCode: 'USD',
        supplierCompanyId: 'company-1',
        shippingCommissions: [],
        supplierCompany: {
          companyUsers: [{ userId: 'supplier-user-1' }],
        },
      }),
    },
  })

  const payout = await service.calculateSupplierPayout('order-1')
  assert.equal(payout.grossOrderAmount, 50000)
  assert.equal(payout.platformFee, 1000)
  assert.equal(payout.netPayoutAmount, 49000)
})

test('transaction fee lookup uses active admin setting', async () => {
  const service = new FeeCalculationService({
    serviceFeeSetting: {
      findUnique: async () => ({
        id: 'fee-1',
        code: 'TRANSACTION_SERVICE_FEE',
        name: 'Transaction Service Fee',
        category: { code: 'TRANSACTION' },
        feeType: FeeType.PERCENTAGE,
        feeValue: 2,
        minFee: null,
        maxFee: null,
        currency: 'USD',
        appliesTo: 'TRADE_ORDER',
        isActive: true,
        status: 'ACTIVE',
        version: 3,
      }),
    },
  })

  const result = await service.calculateFee('TRANSACTION_SERVICE_FEE', 50000)
  assert.equal(result.feeAmount, 1000)
  assert.equal(result.version, 3)
})

test('escrow fee calculation uses dynamic escrow setting', async () => {
  const service = new FeeCalculationService({
    serviceFeeSetting: {
      findUnique: async () => ({
        id: 'fee-escrow',
        code: 'ESCROW_SERVICE_FEE',
        name: 'Escrow Service Fee',
        category: { code: 'ESCROW' },
        feeType: FeeType.PERCENTAGE,
        feeValue: 2,
        minFee: null,
        maxFee: null,
        currency: 'USD',
        appliesTo: 'TRADE_ORDER_ESCROW',
        isActive: true,
        status: 'ACTIVE',
        version: 1,
      }),
    },
  })

  const result = await service.calculateEscrowFee(1500)
  assert.equal(result.feeAmount, 30)
})

test('revenue ledger creation stores normalized revenue amounts', async () => {
  let captured = null
  const service = new FeeCalculationService({
    platformRevenueLedger: {
      create: async ({ data }) => {
        captured = data
        return data
      },
    },
  })

  await service.createRevenueLedger({
    sourceType: 'RFQ_CREDIT_PURCHASE',
    sourceId: 'pkg-1',
    grossAmount: 30,
    feeAmount: 30,
    netAmount: 30,
    currency: 'USD',
  })

  assert.equal(captured.sourceType, 'RFQ_CREDIT_PURCHASE')
  assert.equal(captured.netAmount, 30)
})

test('fee snapshot is immutable after the original calculation object changes', async () => {
  let stored = ''
  const service = new FeeCalculationService({
    feeCalculationSnapshot: {
      create: async ({ data }) => {
        stored = data.calculationData
        return data
      },
    },
  })

  const calculation = { feeAmount: 20, meta: { label: 'initial' } }
  await service.createFeeSnapshot({
    code: 'SAMPLE_ORDER_SERVICE_FEE',
    sourceType: 'SAMPLE_ORDER',
    sourceId: 'sample-1',
    baseAmount: 100,
    feeAmount: 20,
    totalAmount: 120,
    currency: 'USD',
    calculationData: calculation,
  })

  calculation.meta.label = 'changed'
  assert.match(stored, /initial/)
  assert.doesNotMatch(stored, /changed/)
})
