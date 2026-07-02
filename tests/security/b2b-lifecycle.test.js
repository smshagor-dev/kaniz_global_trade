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

function createRequest(url, body) {
  return {
    url,
    headers: new Headers(),
    async json() {
      return body
    },
  }
}

function createParams(values) {
  return { params: Promise.resolve(values) }
}

function createPermissionsMock(overrides = {}) {
  class ApiError extends Error {
    constructor(statusCode, message, errors) {
      super(message)
      this.name = 'ApiError'
      this.statusCode = statusCode
      this.errors = errors
    }
  }

  const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    MODERATOR: 'MODERATOR',
    SUPPLIER_OWNER: 'SUPPLIER_OWNER',
    SUPPLIER_STAFF: 'SUPPLIER_STAFF',
    BUYER: 'BUYER',
    GUEST: 'GUEST',
  }

  return {
    ApiError,
    ROLES,
    requireAuth: async () => ({
      userId: 'user-1',
      email: 'user@example.com',
      roles: [ROLES.BUYER],
      permissions: [],
    }),
    getAuthUser: async () => null,
    requireAdmin: async () => ({
      userId: 'admin-1',
      email: 'admin@example.com',
      roles: [ROLES.ADMIN],
      permissions: [],
    }),
    requireRole: async (_req, ...roles) => ({
      userId: 'user-1',
      email: 'user@example.com',
      roles,
      permissions: [],
      companyId: 'company-a',
    }),
    requireCompanyAccess: async (_input, companyId) => ({
      userId: 'supplier-1',
      email: 'supplier@example.com',
      roles: [ROLES.SUPPLIER_OWNER],
      permissions: [],
      companyId,
    }),
    requireVerifiedSupplier: async (_input, companyId) => ({
      userId: 'supplier-1',
      email: 'supplier@example.com',
      roles: [ROLES.SUPPLIER_OWNER],
      permissions: [],
      companyId: companyId || 'company-a',
    }),
    requireVerifiedBuyer: async () => ({
      userId: 'buyer-1',
      email: 'buyer@example.com',
      roles: [ROLES.BUYER],
      permissions: [],
    }),
    requireChatRoomAccess: async () => ({
      room: { id: 'room-1', companyId: 'company-a', inquiryId: 'inq-1', participants: [] },
      participant: { userId: 'buyer-1', isAdmin: false, isBlocked: false },
    }),
    isAdmin(user) {
      return user.roles.includes(ROLES.ADMIN) || user.roles.includes(ROLES.SUPER_ADMIN)
    },
    ...overrides,
  }
}

const apiUtilsMock = {
  successResponse(data, message = 'Success', meta, status = 200) {
    return new Response(JSON.stringify({ success: true, message, data, meta }), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  },
  errorResponse(message, status = 400, errors) {
    return new Response(JSON.stringify({ success: false, message, errors }), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  },
  handleApiError(error) {
    return new Response(JSON.stringify({
      success: false,
      message: error?.message || 'Internal server error',
      errors: error?.errors,
    }), {
      status: error?.statusCode || 500,
      headers: { 'content-type': 'application/json' },
    })
  },
  getPaginationParams() {
    return { page: 1, limit: 20, skip: 0 }
  },
  paginationMeta(total, page, limit) {
    return { total, page, limit }
  },
}

const companySchemaMock = {
  b2bCompanySchema: { parse: (input) => input },
  b2bCompanyUpdateSchema: { parse: (input) => input },
  b2bVerificationActionSchema: { parse: (input) => input },
}

test('buyer and supplier companies can register and update onboarding profiles', async () => {
  const fraudEvents = []
  let existingCompany = null
  const route = loadWithMocks('../../app/api/b2b/company/route', {
    '@/lib/permissions': createPermissionsMock({
      requireAuth: async () => ({
        userId: 'buyer-1',
        email: 'buyer@example.com',
        roles: ['BUYER'],
        permissions: [],
      }),
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/b2b/company-schema': companySchemaMock,
    '@/lib/b2b/company-service': {
      buildB2BStatusSummary: () => ({}),
      getCompanyByUser: async () => null,
    },
    '@/lib/db/prisma': {
      b2BCompany: {
        async findUnique() {
          return existingCompany
        },
        async create({ data }) {
          existingCompany = { id: 'b2b-1', ...data }
          return existingCompany
        },
        async update({ data }) {
          existingCompany = { ...existingCompany, ...data }
          return existingCompany
        },
      },
    },
    '@/lib/fraud/service': {
      assertFraudActionAllowed: async () => {},
      screenFraudEvent: async (payload) => fraudEvents.push(payload),
    },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { COMPANY_CREATE: 'COMPANY_CREATE', COMPANY_UPDATE: 'COMPANY_UPDATE' } },
    '@prisma/client': { FraudEventType: { COMPANY_CREATE: 'COMPANY_CREATE', COMPANY_UPDATE: 'COMPANY_UPDATE' } },
  })

  const buyerCreate = await route.POST(createRequest('http://localhost/api/b2b/company', {
    companyName: 'Buyer Co',
    companyType: 'BUYER',
    country: 'BD',
    phone: '123',
    businessEmail: 'buyer@co.test',
  }))
  const buyerPayload = await buyerCreate.json()
  assert.equal(buyerCreate.status, 201)
  assert.equal(buyerPayload.data.companyType, 'BUYER')

  const supplierUpdate = await route.PUT(createRequest('http://localhost/api/b2b/company', {
    companyType: 'SUPPLIER',
    companyName: 'Supplier Co',
    phone: '999',
  }))
  const supplierPayload = await supplierUpdate.json()
  assert.equal(supplierUpdate.status, 200)
  assert.equal(supplierPayload.data.companyType, 'SUPPLIER')
  assert.equal(fraudEvents.length, 2)
})

test('admin can approve buyer verification and reject supplier verification', async () => {
  const approveCalls = []
  const rejectCalls = []

  const approveBuyerRoute = loadWithMocks('../../app/api/admin/b2b/companies/[id]/approve-buyer/route', {
    '@/lib/permissions': createPermissionsMock(),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/b2b/company-schema': companySchemaMock,
    '@/lib/b2b/admin-actions': {
      updateBuyerVerification: async (...args) => {
        approveCalls.push(args)
        return { id: args[0], buyerVerificationStatus: 'APPROVED' }
      },
    },
  })

  const rejectSupplierRoute = loadWithMocks('../../app/api/admin/b2b/companies/[id]/reject-supplier/route', {
    '@/lib/permissions': createPermissionsMock(),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/b2b/company-schema': companySchemaMock,
    '@/lib/b2b/admin-actions': {
      updateSupplierVerification: async (...args) => {
        rejectCalls.push(args)
        return { id: args[0], supplierVerificationStatus: 'REJECTED' }
      },
    },
  })

  const approveResponse = await approveBuyerRoute.POST(
    createRequest('http://localhost/api/admin/b2b/companies/b2b-1/approve-buyer', { note: 'Looks good' }),
    createParams({ id: 'b2b-1' })
  )
  const approvePayload = await approveResponse.json()

  const rejectResponse = await rejectSupplierRoute.POST(
    createRequest('http://localhost/api/admin/b2b/companies/b2b-1/reject-supplier', { note: 'Need more documents' }),
    createParams({ id: 'b2b-1' })
  )
  const rejectPayload = await rejectResponse.json()

  assert.equal(approveResponse.status, 200)
  assert.equal(approvePayload.data.buyerVerificationStatus, 'APPROVED')
  assert.equal(rejectResponse.status, 200)
  assert.equal(rejectPayload.data.supplierVerificationStatus, 'REJECTED')
  assert.equal(approveCalls[0][2], 'APPROVED')
  assert.equal(rejectCalls[0][2], 'REJECTED')
})

test('verified supplier can create product and audit is written', async () => {
  const auditCalls = []
  const route = loadWithMocks('../../app/api/products/route', {
    '@/lib/permissions': createPermissionsMock(),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      subscription: { findUnique: async () => null },
      product: {
        count: async () => 0,
        create: async ({ data }) => ({ id: 'product-1', ...data }),
      },
      fraudAlert: { count: async () => 0 },
    },
    '@/lib/utils/audit': {
      logCreate: async (...args) => auditCalls.push(args),
    },
    '@/lib/search': { indexProduct: async () => {} },
    '@/lib/utils/slug': { uniqueSlug: async () => 'product-slug' },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { PRODUCT_CREATE: 'PRODUCT_CREATE' } },
    '@prisma/client': { FraudEventType: { PRODUCT_CREATE: 'PRODUCT_CREATE' } },
  })

  const response = await route.POST(createRequest('http://localhost/api/products', {
    companyId: 'company-a',
    categoryId: 'category-1',
    name: 'Verified Product',
  }))
  const payload = await response.json()

  assert.equal(response.status, 201)
  assert.equal(payload.data.status, 'APPROVED')
  assert.equal(auditCalls.length, 1)
})

test('product update and delete enforce company ownership', async () => {
  const permissions = createPermissionsMock()
  permissions.requireCompanyAccess = async () => {
    throw new permissions.ApiError(403, 'Access denied')
  }

  const route = loadWithMocks('../../app/api/products/[id]/route', {
    '@/lib/permissions': permissions,
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      product: {
        findUnique: async () => ({ id: 'product-1', companyId: 'company-b', status: 'APPROVED' }),
      },
    },
    '@/lib/utils/audit': { logUpdate: async () => {}, logDelete: async () => {} },
    '@/lib/search': { indexProduct: async () => {}, removeProductFromIndex: async () => {} },
    '@/lib/analytics/tracking': { trackProductView: async () => {} },
  })

  const putResponse = await route.PUT(
    createRequest('http://localhost/api/products/product-1', { name: 'Updated name' }),
    createParams({ id: 'product-1' })
  )
  const deleteResponse = await route.DELETE(
    createRequest('http://localhost/api/products/product-1'),
    createParams({ id: 'product-1' })
  )

  assert.equal(putResponse.status, 403)
  assert.equal(deleteResponse.status, 403)
})

test('admin product approval sends notification and writes audit log', async () => {
  const notifications = []
  const audit = []
  const route = loadWithMocks('../../app/api/products/[id]/approve/route', {
    '@/lib/permissions': createPermissionsMock(),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      product: {
        findUnique: async () => ({
          id: 'product-1',
          name: 'Pending Product',
          slug: 'pending-product',
          shortDescription: 'short',
          companyId: 'company-a',
          categoryId: 'category-1',
          priceMin: 10,
          priceMax: 20,
          moq: 1,
          isFeatured: false,
          company: {
            companyUsers: [{
              userId: 'supplier-1',
              user: { email: 'supplier@example.com', firstName: 'Supplier' },
            }],
          },
        }),
        update: async ({ data }) => ({ id: 'product-1', ...data }),
      },
    },
    '@/lib/utils/audit': {
      logApprove: async (...args) => audit.push(['approve', ...args]),
      logReject: async (...args) => audit.push(['reject', ...args]),
    },
    '@/lib/search': { indexProduct: async () => {}, removeProductFromIndex: async () => {} },
    '@/server/services/notification': {
      createNotification: async (payload) => notifications.push(payload),
    },
    '@/lib/email': { sendProductApprovalEmail: async () => {} },
  })

  const response = await route.POST(
    createRequest('http://localhost/api/products/product-1/approve', { action: 'APPROVE' }),
    createParams({ id: 'product-1' })
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.data.status, 'APPROVED')
  assert.equal(notifications.length, 1)
  assert.equal(audit[0][0], 'approve')
})

test('verified buyer can create RFQ and supplier can view relevant RFQ detail', async () => {
  const notifications = []
  const rfqsRoute = loadWithMocks('../../app/api/rfqs/route', {
    '@/lib/permissions': createPermissionsMock({
      requireAuth: async () => ({
        userId: 'buyer-1',
        email: 'buyer@example.com',
        roles: ['BUYER'],
        permissions: [],
      }),
      requireVerifiedBuyer: async () => ({
        userId: 'buyer-1',
        email: 'buyer@example.com',
        roles: ['BUYER'],
        permissions: [],
      }),
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      rFQ: {
        create: async ({ data }) => ({ id: 'rfq-1', ...data }),
      },
      company: {
        findMany: async () => [{
          id: 'company-a',
          companyUsers: [{
            userId: 'supplier-1',
            user: { email: 'supplier@example.com', firstName: 'Supplier', id: 'supplier-1' },
          }],
        }],
      },
    },
    '@/server/services/notification': {
      createNotification: async (payload) => notifications.push(payload),
    },
    '@/lib/email': { sendNewRFQEmail: async () => {} },
    '@/lib/ai/rfq-matching': { getAiMatchedSupplierOwnersForRFQ: async () => [] },
    '@/lib/rfqs/visibility': { buildPublicActiveRFQWhere: () => ({}) },
    '@/lib/analytics/tracking': { trackCompanyRfqs: async () => {} },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { RFQ_CREATE: 'RFQ_CREATE' } },
    '@prisma/client': { FraudEventType: { RFQ_CREATE: 'RFQ_CREATE' } },
  })

  const createResponse = await rfqsRoute.POST(createRequest('http://localhost/api/rfqs', {
    productName: 'Copper Wire',
    quantity: '200',
    isPublic: true,
  }))
  const createPayload = await createResponse.json()
  assert.equal(createResponse.status, 201)
  assert.equal(createPayload.data.status, 'OPEN')
  assert.equal(notifications.length, 1)

  const rfqDetailRoute = loadWithMocks('../../app/api/rfqs/[id]/route', {
    '@/lib/permissions': createPermissionsMock({
      getAuthUser: async () => ({
        userId: 'supplier-1',
        email: 'supplier@example.com',
        roles: ['SUPPLIER_OWNER'],
        permissions: [],
        companyId: 'company-a',
      }),
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      rFQ: {
        findUnique: async ({ where }) => {
          if (where.id === 'rfq-1') {
            return {
              id: 'rfq-1',
              buyerId: 'buyer-1',
              status: 'OPEN',
              isPublic: true,
              expiresAt: new Date(Date.now() + 86400000),
              deletedAt: null,
              productName: 'Copper Wire',
              quantity: '200',
              unit: 'KG',
              budget: 1000,
              requiredDate: null,
              description: 'Need copper wire',
              createdAt: new Date(),
              quotationCount: 1,
              buyer: { id: 'buyer-1', firstName: 'Buyer', lastName: 'One' },
              category: { id: 'cat-1', name: 'Metals' },
              destinationCountry: { id: 'c-1', name: 'Bangladesh', code: 'BD', flag: 'BD' },
              currency: { id: 'cur-1', code: 'USD', symbol: '$' },
              _count: { quotations: 1 },
              quotations: [{ id: 'quote-1', status: 'SENT', createdAt: new Date(), totalPrice: 1000, currencyCode: 'USD' }],
            }
          }
          return null
        },
      },
    },
    '@/lib/rfqs/visibility': { isPubliclyVisibleRFQStatus: () => true },
  })

  const detailResponse = await rfqDetailRoute.GET(
    { url: 'http://localhost/api/rfqs/rfq-1', headers: new Headers() },
    createParams({ id: 'rfq-1' })
  )
  const detailPayload = await detailResponse.json()
  assert.equal(detailResponse.status, 200)
  assert.equal(detailPayload.data.access, 'public')
})

test('verified supplier can submit quotation and invalid RFQ is blocked', async () => {
  const notifications = []
  const route = loadWithMocks('../../app/api/quotations/route', {
    '@/lib/permissions': createPermissionsMock(),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      $transaction: async (callback) => callback({
        rFQ: {
          findUnique: async () => ({
            id: 'rfq-1',
            buyerId: 'buyer-1',
            status: 'OPEN',
            expiresAt: new Date(Date.now() + 86400000),
            deletedAt: null,
          }),
          update: async () => {},
        },
        rFQQuotation: {
          findFirst: async () => null,
          create: async ({ data }) => ({
            id: 'quote-1',
            ...data,
            items: data.items.createMany.data,
            company: { name: 'Supplier Co' },
          }),
        },
      }),
      user: {
        findUnique: async () => ({ email: 'buyer@example.com', firstName: 'Buyer' }),
      },
    },
    '@/server/services/notification': { createNotification: async (payload) => notifications.push(payload) },
    '@/lib/email': { sendQuotationEmail: async () => {} },
    '@/lib/rfqs/visibility': { isPubliclyVisibleRFQStatus: (status) => status === 'OPEN' },
    '@/lib/analytics/tracking': { trackQuotationCreated: async () => {} },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { QUOTATION_CREATE: 'QUOTATION_CREATE' } },
    '@prisma/client': { FraudEventType: { QUOTATION_CREATE: 'QUOTATION_CREATE' } },
  })

  const successResponse = await route.POST(createRequest('http://localhost/api/quotations', {
    rfqId: 'rfq-1',
    companyId: 'company-a',
    totalPrice: 500,
    currencyCode: 'USD',
    deliveryTime: '7 days',
    notes: 'We can supply this order.',
    items: [{ description: 'Copper Wire', quantity: 1, unitPrice: 500, totalPrice: 500 }],
  }))
  const successPayload = await successResponse.json()
  assert.equal(successResponse.status, 201)
  assert.equal(successPayload.data.id, 'quote-1')
  assert.equal(notifications.length, 1)

  const blockedRoute = loadWithMocks('../../app/api/quotations/route', {
    '@/lib/permissions': createPermissionsMock(),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      $transaction: async (callback) => callback({
        rFQ: {
          findUnique: async () => ({
            id: 'rfq-2',
            buyerId: 'buyer-1',
            status: 'CLOSED',
            expiresAt: new Date(Date.now() + 86400000),
            deletedAt: null,
          }),
        },
        rFQQuotation: {
          findFirst: async () => null,
        },
      }),
    },
    '@/server/services/notification': { createNotification: async () => {} },
    '@/lib/email': { sendQuotationEmail: async () => {} },
    '@/lib/rfqs/visibility': { isPubliclyVisibleRFQStatus: () => false },
    '@/lib/analytics/tracking': { trackQuotationCreated: async () => {} },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { QUOTATION_CREATE: 'QUOTATION_CREATE' } },
    '@prisma/client': { FraudEventType: { QUOTATION_CREATE: 'QUOTATION_CREATE' } },
  })

  const blockedResponse = await blockedRoute.POST(createRequest('http://localhost/api/quotations', {
    rfqId: 'rfq-2',
    companyId: 'company-a',
    totalPrice: 500,
    currencyCode: 'USD',
    deliveryTime: '7 days',
    notes: 'We can supply this order.',
    items: [{ description: 'Copper Wire', quantity: 1, unitPrice: 500, totalPrice: 500 }],
  }))
  assert.equal(blockedResponse.status, 409)
})

test('buyer can accept quotation into trade order and other buyers cannot access it', async () => {
  const notifications = []
  const actionRoute = loadWithMocks('../../app/api/quotations/[id]/action/route', {
    '@/lib/permissions': createPermissionsMock({
      requireAuth: async () => ({
        userId: 'buyer-1',
        email: 'buyer@example.com',
        roles: ['BUYER'],
        permissions: [],
      }),
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      rFQQuotation: {
        findUnique: async () => ({
          id: 'quote-1',
          buyerId: 'buyer-1',
          status: 'SENT',
          company: { name: 'Supplier Co', companyUsers: [{ userId: 'supplier-1' }] },
        }),
        update: async ({ data }) => ({ id: 'quote-1', ...data }),
      },
    },
    '@/lib/trade/create-trade-order': {
      createTradeOrderFromQuotation: async () => ({ id: 'order-1', status: 'PENDING_ESCROW_PAYMENT' }),
    },
    '@/server/services/notification': {
      createNotification: async (payload) => notifications.push(payload),
    },
  })

  const acceptResponse = await actionRoute.POST(
    createRequest('http://localhost/api/quotations/quote-1/action', { action: 'ACCEPT' }),
    createParams({ id: 'quote-1' })
  )
  const acceptPayload = await acceptResponse.json()
  assert.equal(acceptResponse.status, 200)
  assert.equal(acceptPayload.data.tradeOrder.id, 'order-1')
  assert.equal(notifications.length, 1)

  const quotationRoute = loadWithMocks('../../app/api/quotations/[id]/route', {
    '@/lib/permissions': createPermissionsMock({
      requireAuth: async () => ({
        userId: 'buyer-2',
        email: 'other@example.com',
        roles: ['BUYER'],
        permissions: [],
      }),
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      rFQQuotation: {
        findUnique: async () => ({
          id: 'quote-1',
          buyerId: 'buyer-1',
          companyId: 'company-a',
          company: { companyUsers: [] },
          items: [],
          attachments: [],
          rfq: null,
          inquiry: null,
          paymentTerm: null,
          tradeOrder: null,
        }),
      },
    },
  })

  const forbiddenResponse = await quotationRoute.GET(
    { url: 'http://localhost/api/quotations/quote-1', headers: new Headers() },
    createParams({ id: 'quote-1' })
  )
  assert.equal(forbiddenResponse.status, 403)
})

test('trade order list is scoped to buyer or supplier ownership', async () => {
  const seenWhere = []
  const route = loadWithMocks('../../app/api/trade-orders/route', {
    '@/lib/permissions': createPermissionsMock({
      requireAuth: async () => ({
        userId: 'supplier-1',
        email: 'supplier@example.com',
        roles: ['SUPPLIER_OWNER'],
        permissions: [],
        companyId: 'company-a',
      }),
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      tradeOrder: {
        findMany: async ({ where }) => {
          seenWhere.push(where)
          return []
        },
        count: async () => 0,
      },
    },
    '@/lib/trade/create-trade-order': { createTradeOrderFromQuotation: async () => ({}) },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { ORDER_CREATE: 'ORDER_CREATE' } },
  })

  const response = await route.GET({ url: 'http://localhost/api/trade-orders', headers: new Headers() })
  assert.equal(response.status, 200)
  assert.equal(seenWhere[0].supplierCompanyId, 'company-a')
})

test('shipment flow enforces ownership, valid status transitions, and buyer visibility', async () => {
  const notifications = []
  const shipmentRoute = loadWithMocks('../../app/api/trade-orders/[id]/shipment/route', {
    '@/lib/permissions': createPermissionsMock({
      requireAuth: async () => ({
        userId: 'supplier-1',
        email: 'supplier@example.com',
        roles: ['SUPPLIER_OWNER'],
        permissions: [],
        companyId: 'company-a',
      }),
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      tradeOrder: {
        findUnique: async ({ where }) => {
          if (where.id === 'order-invalid') {
            return { id: 'order-invalid', buyerId: 'buyer-1', supplierCompanyId: 'company-a', status: 'PENDING_ESCROW_PAYMENT' }
          }
          return { id: 'order-1', buyerId: 'buyer-1', supplierCompanyId: 'company-a', productName: 'Copper Wire', quantity: 1, status: 'ESCROW_FUNDED' }
        },
        update: async () => {},
      },
      $transaction: async (callback) => callback({
        shipment: {
          create: async ({ data }) => ({ id: 'shipment-1', ...data }),
          findUniqueOrThrow: async () => ({ id: 'shipment-1', trackingNumber: 'TRK123', events: [] }),
        },
        shipmentEvent: { create: async () => {} },
        tradeOrder: { update: async () => {} },
      }),
      shipment: {
        findUnique: async () => ({ id: 'shipment-1', status: 'SHIPPED', lastEvent: 'In transit', lastLocation: 'Port', metadata: null }),
      },
    },
    '@/lib/shipping/tracking': {
      buildTrackingUrl: async () => 'https://tracking.example/TRK123',
      syncCarrierTracking: async () => ({ status: 'IN_TRANSIT', lastEvent: 'Picked up', lastLocation: 'Port', rawPayload: '{}' }),
    },
    '@/server/services/notification': {
      createNotification: async (payload) => notifications.push(payload),
    },
  })

  const invalidStatus = await shipmentRoute.POST(
    createRequest('http://localhost/api/trade-orders/order-invalid/shipment', {
      carrier: 'DHL',
      trackingNumber: 'TRK000',
    }),
    createParams({ id: 'order-invalid' })
  )
  assert.equal(invalidStatus.status, 409)

  const createResponse = await shipmentRoute.POST(
    createRequest('http://localhost/api/trade-orders/order-1/shipment', {
      carrier: 'DHL',
      trackingNumber: 'TRK123',
    }),
    createParams({ id: 'order-1' })
  )
  const createPayload = await createResponse.json()
  assert.equal(createResponse.status, 201)
  assert.equal(createPayload.data.id, 'shipment-1')
  assert.equal(notifications.length, 1)

  const buyerViewRoute = loadWithMocks('../../app/api/trade-orders/[id]/shipment/route', {
    '@/lib/permissions': createPermissionsMock({
      requireAuth: async () => ({
        userId: 'buyer-1',
        email: 'buyer@example.com',
        roles: ['BUYER'],
        permissions: [],
      }),
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      tradeOrder: {
        findUnique: async () => ({
          id: 'order-1',
          buyerId: 'buyer-1',
          supplierCompanyId: 'company-a',
          shipments: [{ id: 'shipment-1', events: [] }],
        }),
      },
    },
    '@/lib/shipping/tracking': { buildTrackingUrl: async () => '', syncCarrierTracking: async () => null },
    '@/server/services/notification': { createNotification: async () => {} },
  })

  const buyerView = await buyerViewRoute.GET(
    { url: 'http://localhost/api/trade-orders/order-1/shipment', headers: new Headers() },
    createParams({ id: 'order-1' })
  )
  assert.equal(buyerView.status, 200)

  const unrelatedRoute = loadWithMocks('../../app/api/trade-orders/[id]/shipment/route', {
    '@/lib/permissions': createPermissionsMock({
      requireAuth: async () => ({
        userId: 'outsider-1',
        email: 'outsider@example.com',
        roles: ['BUYER'],
        permissions: [],
      }),
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      tradeOrder: {
        findUnique: async () => ({
          id: 'order-1',
          buyerId: 'buyer-1',
          supplierCompanyId: 'company-a',
          shipments: [{ id: 'shipment-1', events: [] }],
        }),
      },
    },
    '@/lib/shipping/tracking': { buildTrackingUrl: async () => '', syncCarrierTracking: async () => null },
    '@/server/services/notification': { createNotification: async () => {} },
  })

  const unrelatedView = await unrelatedRoute.GET(
    { url: 'http://localhost/api/trade-orders/order-1/shipment', headers: new Headers() },
    createParams({ id: 'order-1' })
  )
  assert.equal(unrelatedView.status, 403)
})

test('chat room creation requires valid relationship and message access requires membership', async () => {
  const notifications = []
  const chatRoute = loadWithMocks('../../app/api/chat/rooms/route', {
    '@/lib/permissions': createPermissionsMock({
      requireRole: async () => ({
        userId: 'buyer-1',
        email: 'buyer@example.com',
        roles: ['BUYER'],
        permissions: [],
      }),
      requireVerifiedBuyer: async () => ({
        userId: 'buyer-1',
        email: 'buyer@example.com',
        roles: ['BUYER'],
        permissions: [],
      }),
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      user: {
        findUnique: async () => ({
          id: 'supplier-1',
          roles: [{ role: { name: 'SUPPLIER_OWNER' } }],
          companyUsers: [{ companyId: 'company-a' }],
        }),
      },
      inquiry: {
        findUnique: async () => ({ id: 'inq-1', buyerId: 'buyer-1', companyId: 'company-a' }),
        findFirst: async () => null,
      },
      rFQQuotation: { findFirst: async () => null },
      tradeOrder: { findFirst: async () => null },
      chatRoom: {
        findFirst: async () => null,
        create: async ({ data }) => ({ id: 'room-1', ...data, participants: [] }),
      },
    },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { MESSAGE_SEND: 'MESSAGE_SEND' } },
    '@prisma/client': { FraudEventType: { SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY' } },
  })

  const createRoom = await chatRoute.POST(createRequest('http://localhost/api/chat/rooms', {
    participantId: 'supplier-1',
    companyId: 'company-a',
    inquiryId: 'inq-1',
  }))
  const roomPayload = await createRoom.json()
  assert.equal(createRoom.status, 201)
  assert.equal(roomPayload.data.id, 'room-1')

  const invalidChatRoute = loadWithMocks('../../app/api/chat/rooms/route', {
    '@/lib/permissions': createPermissionsMock({
      requireRole: async () => ({
        userId: 'buyer-1',
        email: 'buyer@example.com',
        roles: ['BUYER'],
        permissions: [],
      }),
      requireVerifiedBuyer: async () => ({
        userId: 'buyer-1',
        email: 'buyer@example.com',
        roles: ['BUYER'],
        permissions: [],
      }),
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      user: {
        findUnique: async () => ({
          id: 'supplier-1',
          roles: [{ role: { name: 'SUPPLIER_OWNER' } }],
          companyUsers: [{ companyId: 'company-a' }],
        }),
      },
      inquiry: {
        findUnique: async () => null,
        findFirst: async () => null,
      },
      rFQQuotation: { findFirst: async () => null },
      tradeOrder: { findFirst: async () => null },
      chatRoom: { findFirst: async () => null },
    },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { MESSAGE_SEND: 'MESSAGE_SEND' } },
    '@prisma/client': { FraudEventType: { SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY' } },
  })

  const invalidRoom = await invalidChatRoute.POST(createRequest('http://localhost/api/chat/rooms', {
    participantId: 'supplier-1',
    companyId: 'company-a',
  }))
  assert.equal(invalidRoom.status, 403)

  const messageRoute = loadWithMocks('../../app/api/chat/rooms/[roomId]/messages/route', {
    '@/lib/permissions': createPermissionsMock({
      requireChatRoomAccess: async () => {
        throw new (createPermissionsMock().ApiError)(403, 'Access denied')
      },
    }),
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      message: { findMany: async () => [], count: async () => 0 },
      chatParticipant: { update: async () => {} },
    },
  })

  const messageResponse = await messageRoute.GET(
    { url: 'http://localhost/api/chat/rooms/room-1/messages', headers: new Headers() },
    createParams({ roomId: 'room-1' })
  )
  assert.equal(messageResponse.status, 403)
  assert.equal(notifications.length, 0)
})
