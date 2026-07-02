const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')

require('ts-node/register/transpile-only')
require('tsconfig-paths/register')

function loadWithMocks(modulePath, mocks) {
  const resolved = require.resolve(modulePath)
  delete require.cache[resolved]

  const originalLoad = Module._load
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request]
    }

    return originalLoad.call(this, request, parent, isMain)
  }

  try {
    return require(resolved)
  } finally {
    Module._load = originalLoad
  }
}

test('enforceWebhookIdempotency stores and reuses processed webhook keys', async () => {
  const updates = []
  const safety = loadWithMocks('../../lib/payment/safety', {
    '@/lib/db/prisma': {
      payment: {
        update: async ({ data }) => {
          updates.push(data.metadata)
          return {}
        },
      },
    },
    '@/lib/finance/service-fees': {
      FeeCalculationService: class {},
    },
    '@/lib/permissions': {
      ApiError: class ApiError extends Error {
        constructor(statusCode, message) {
          super(message)
          this.statusCode = statusCode
        }
      },
      isAdmin: () => false,
    },
    '@/lib/payment/stripe': { constructWebhookEvent: async () => ({}) },
    '@/lib/payment/nowpayments': { verifyNOWPaymentsIpnSignature: async () => true },
  })

  const first = await safety.enforceWebhookIdempotency({
    paymentId: 'payment-1',
    eventKey: 'event-1',
    metadata: JSON.stringify({ existing: true }),
  })
  const second = await safety.enforceWebhookIdempotency({
    paymentId: 'payment-1',
    eventKey: 'event-1',
    metadata: first.metadataJson,
  })

  assert.equal(first.duplicate, false)
  assert.equal(second.duplicate, true)
  assert.equal(updates.length, 1)
  assert.match(updates[0], /event-1/)
})

test('createImmutableFeeSnapshot preserves original calculation state', async () => {
  let stored = ''
  const safety = loadWithMocks('../../lib/payment/safety', {
    '@/lib/db/prisma': {},
    '@/lib/finance/service-fees': {
      FeeCalculationService: class {
        async createFeeSnapshot(data) {
          stored = JSON.stringify(data.calculationData)
          return data
        }
      },
    },
    '@/lib/permissions': {
      ApiError: class ApiError extends Error {},
      isAdmin: () => false,
    },
    '@/lib/payment/stripe': { constructWebhookEvent: async () => ({}) },
    '@/lib/payment/nowpayments': { verifyNOWPaymentsIpnSignature: async () => true },
  })

  const calculationData = { feeAmount: 15, config: { version: 1 } }
  await safety.createImmutableFeeSnapshot({
    code: 'TRADE_ORDER_TRANSACTION_FEE',
    sourceType: 'TRADE_ORDER',
    sourceId: 'order-1',
    baseAmount: 100,
    feeAmount: 15,
    totalAmount: 115,
    currency: 'USD',
    calculationData,
  })

  calculationData.config.version = 9
  assert.match(stored, /"version":1/)
  assert.doesNotMatch(stored, /"version":9/)
})

test('reverseLedgerEntry creates balanced reversal and marks original as reversed', async () => {
  const createdLedgers = []
  const reversalRows = []
  const updatedLedgers = []
  const safety = loadWithMocks('../../lib/payment/safety', {
    '@/lib/db/prisma': {},
    '@/lib/finance/service-fees': require('../../lib/finance/service-fees'),
    '@/lib/permissions': require('../../lib/permissions'),
    '@/lib/payment/stripe': { constructWebhookEvent: async () => ({}) },
    '@/lib/payment/nowpayments': { verifyNOWPaymentsIpnSignature: async () => true },
  })

  await safety.reverseLedgerEntry({
    originalLedgerId: 'ledger-1',
    createdById: 'admin-1',
    paymentId: 'payment-1',
    reason: 'Refund approved',
  }, {
    platformRevenueLedger: {
      findUnique: async () => ({
        id: 'ledger-1',
        sourceType: 'TRADE_COMMISSION',
        sourceId: 'order-1',
        userId: 'buyer-1',
        companyId: 'company-a',
        orderId: 'order-1',
        tradeOrderId: 'order-1',
        sampleOrderId: null,
        paymentId: 'payment-1',
        grossAmount: 25,
        feeAmount: 25,
        netAmount: 25,
        taxAmount: 0,
        taxSettingId: null,
        currency: 'USD',
      }),
      create: async ({ data }) => {
        createdLedgers.push(data)
        return { id: 'ledger-2', ...data }
      },
      update: async ({ data }) => {
        updatedLedgers.push(data)
        return {}
      },
    },
    revenueReversalLedger: {
      create: async ({ data }) => {
        reversalRows.push(data)
        return data
      },
    },
  })

  assert.equal(createdLedgers[0].netAmount, -25)
  assert.equal(createdLedgers[0].revenueType, 'REVERSAL')
  assert.equal(reversalRows[0].amount, 25)
  assert.equal(updatedLedgers[0].status, 'REVERSED')
})

test('requirePaymentOwnership blocks unrelated buyers from accessing payments', async () => {
  const { requirePaymentOwnership } = require('../../lib/payment/safety')

  assert.throws(
    () => requirePaymentOwnership(
      {
        userId: 'buyer-2',
        roles: ['BUYER'],
        permissions: [],
      },
      {
        id: 'payment-1',
        userId: 'buyer-1',
      }
    ),
    /Access denied/
  )
})

test('billing route strips payment metadata for supplier-side viewers', async () => {
  const route = loadWithMocks('../../app/api/billing/route', {
    '@/lib/permissions': {
      requireAuth: async () => ({
        userId: 'supplier-1',
        email: 'supplier@example.com',
        roles: ['SUPPLIER_OWNER'],
        permissions: [],
        companyId: 'company-a',
      }),
      ApiError: class ApiError extends Error {
        constructor(statusCode, message) {
          super(message)
          this.statusCode = statusCode
        }
      },
      isAdmin: () => false,
    },
    '@/lib/db/prisma': {
      companyUser: { findFirst: async () => ({ companyId: 'company-a' }) },
      company: { findUnique: async () => ({ id: 'company-a', name: 'Supplier Co' }) },
      subscription: { findUnique: async () => null },
      subscriptionPlan: { findMany: async () => [] },
      payment: {
        findMany: async () => [{
          id: 'payment-1',
          userId: 'buyer-1',
          metadata: '{"gateway":"secret"}',
          invoice: null,
          tradeOrder: { id: 'order-1', productName: 'Copper', status: 'ESCROW_FUNDED', supplierCompanyId: 'company-a' },
          sampleOrder: null,
        }],
      },
      manualPaymentRequest: { findMany: async () => [] },
    },
    '@/lib/payment/safety': require('../../lib/payment/safety'),
    '@/lib/payment/mode': { resolveStripeMode: () => 'sandbox' },
    '@/lib/settings/system': { getSettingsMap: async () => ({}) },
    '@/lib/utils/api': {
      successResponse(data) {
        return new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
      handleApiError(error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: error.statusCode || 500 })
      },
    },
    '@/lib/packages': { hasPackageAccess: () => true },
  })

  const response = await route.GET({ url: 'http://localhost/api/billing', headers: new Headers() })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.data.payments[0].metadata, undefined)
})

test('manual payment approval writes an audit log entry', async () => {
  const auditCalls = []
  const route = loadWithMocks('../../app/api/admin/manual-payments/route', {
    '@/lib/permissions': {
      requireAdmin: async () => ({
        userId: 'admin-1',
        roles: ['ADMIN'],
        permissions: [],
      }),
      ApiError: class ApiError extends Error {
        constructor(statusCode, message) {
          super(message)
          this.statusCode = statusCode
        }
      },
    },
    '@/lib/db/prisma': {
      manualPaymentRequest: {
        findUnique: async () => ({
          id: 'req-1',
          companyId: 'company-a',
          planId: 'plan-1',
          amount: 99,
          currency: 'USD',
          transferRef: 'bank-1',
        }),
        update: async ({ data }) => ({ id: 'req-1', ...data }),
      },
      subscriptionPlan: { findUnique: async () => ({ id: 'plan-1', name: 'Premium', featuredCompany: true, yearlyPrice: 999 }) },
      company: { findUnique: async () => ({ id: 'company-a', name: 'Buyer Co' }), update: async () => ({}) },
      companyUser: {
        findFirst: async () => ({
          userId: 'owner-1',
          user: { email: 'owner@example.com', firstName: 'Owner', lastName: 'One' },
        }),
      },
      subscription: { upsert: async () => ({ id: 'sub-1' }) },
      invoice: { create: async () => ({ id: 'inv-1', invoiceNumber: 'INV-1', total: 99, currency: 'USD', paidAt: new Date() }) },
      payment: { create: async () => ({ id: 'payment-1' }) },
    },
    '@/lib/email': { sendInvoicePaidEmail: async () => {} },
    '@/server/services/notification': { createNotification: async () => {} },
    '@/lib/utils/audit': {
      logApprove: async (...args) => auditCalls.push(args),
      logReject: async () => {},
    },
    '@/lib/utils/api': {
      successResponse(data, message = 'ok', meta, status = 200) {
        return new Response(JSON.stringify({ success: true, data, message, meta }), {
          status,
          headers: { 'content-type': 'application/json' },
        })
      },
      handleApiError(error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: error.statusCode || 500 })
      },
      getPaginationParams() {
        return { page: 1, limit: 20, skip: 0 }
      },
      paginationMeta() {
        return {}
      },
    },
  })

  const response = await route.PATCH({
    headers: new Headers(),
    async json() {
      return { requestId: 'req-1', status: 'PAID', reviewNotes: 'Approved after bank check' }
    },
  })

  assert.equal(response.status, 200)
  assert.equal(auditCalls.length, 1)
  assert.equal(auditCalls[0][0], 'admin-1')
})

test('NOWPayments callback rejects invalid webhook signatures', async () => {
  const route = loadWithMocks('../../app/api/payments/nowpayments/callback/route', {
    '@/lib/db/prisma': {},
    '@/server/services/notification': { createNotification: async () => {} },
    '@/lib/email': { sendInvoicePaidEmail: async () => {} },
    '@/lib/payment/nowpayments': {},
    '@/lib/payment/safety': {
      verifyWebhookSignature: async () => {
        throw new Error('Invalid NOWPayments signature')
      },
      enforceWebhookIdempotency: async () => ({ duplicate: false }),
      assertPaymentStatusTransition: () => {},
    },
    '@/lib/advertising/payment': { failAdCampaignPayment: async () => {}, finalizeAdCampaignPayment: async () => {} },
    '@/lib/fraud/service': { screenFraudEvent: async () => {} },
    '@prisma/client': { FraudEventType: { PAYMENT_ACTIVITY: 'PAYMENT_ACTIVITY' } },
  })

  const response = await route.POST({
    headers: new Headers(),
    async text() {
      return '{}'
    },
  })

  assert.equal(response.status, 401)
})

test('NOWPayments callback ignores duplicate webhook deliveries', async () => {
  let updates = 0
  const route = loadWithMocks('../../app/api/payments/nowpayments/callback/route', {
    '@/lib/db/prisma': {
      payment: {
        findFirst: async () => ({
          id: 'payment-1',
          status: 'PENDING',
          metadata: '{}',
          transactionId: 'order-1',
        }),
        update: async () => {
          updates += 1
          return {}
        },
      },
    },
    '@/server/services/notification': { createNotification: async () => {} },
    '@/lib/email': { sendInvoicePaidEmail: async () => {} },
    '@/lib/payment/nowpayments': {},
    '@/lib/payment/safety': {
      verifyWebhookSignature: async () => ({
        order_id: 'order-1',
        payment_id: 'crypto-1',
        payment_status: 'finished',
      }),
      enforceWebhookIdempotency: async () => ({ duplicate: true }),
      assertPaymentStatusTransition: () => {},
    },
    '@/lib/advertising/payment': { failAdCampaignPayment: async () => {}, finalizeAdCampaignPayment: async () => {} },
    '@/lib/fraud/service': { screenFraudEvent: async () => {} },
    '@prisma/client': { FraudEventType: { PAYMENT_ACTIVITY: 'PAYMENT_ACTIVITY' } },
  })

  const response = await route.POST({
    headers: new Headers(),
    async text() {
      return '{"order_id":"order-1"}'
    },
  })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.alreadyProcessed, true)
  assert.equal(updates, 0)
})
