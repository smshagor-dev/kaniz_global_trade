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

function createPermissionsMock(overrides = {}) {
  class ApiError extends Error {
    constructor(statusCode, message) {
      super(message)
      this.name = 'ApiError'
      this.statusCode = statusCode
    }
  }

  return {
    ApiError,
    ROLES: {
      SUPER_ADMIN: 'SUPER_ADMIN',
      ADMIN: 'ADMIN',
      MODERATOR: 'MODERATOR',
      SUPPLIER_OWNER: 'SUPPLIER_OWNER',
      SUPPLIER_STAFF: 'SUPPLIER_STAFF',
      BUYER: 'BUYER',
      GUEST: 'GUEST',
    },
    requireAuth: async () => ({
      userId: 'user-1',
      email: 'user@example.com',
      roles: ['BUYER'],
      permissions: [],
      companyId: undefined,
    }),
    getAuthUser: async () => null,
    isAdmin: () => false,
    requireRole: async (_req, ...roles) => ({
      userId: 'user-1',
      email: 'user@example.com',
      roles,
      permissions: [],
      companyId: 'company-a',
    }),
    requireCompanyAccess: async (_input, companyId) => ({
      userId: 'user-1',
      email: 'user@example.com',
      roles: ['SUPPLIER_OWNER'],
      permissions: [],
      companyId,
    }),
    requireVerifiedSupplier: async (_input, companyId) => ({
      userId: 'user-1',
      email: 'supplier@example.com',
      roles: ['SUPPLIER_OWNER'],
      permissions: [],
      companyId: companyId || 'company-a',
    }),
    requireVerifiedBuyer: async () => ({
      userId: 'user-1',
      email: 'buyer@example.com',
      roles: ['BUYER'],
      permissions: [],
    }),
    requireChatRoomAccess: async () => ({
      room: { id: 'room-1', companyId: 'company-a', inquiryId: null, participants: [] },
      participant: { userId: 'user-1', isAdmin: false, isBlocked: false },
    }),
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
  handleApiError(error) {
    return new Response(JSON.stringify({
      success: false,
      message: error?.message || 'Internal server error',
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

test('requireAuth blocks unauthenticated access', async () => {
  const permissions = loadWithMocks('../../lib/permissions', {
    '@/lib/db/prisma': {},
    '@/lib/auth/jwt': { verifyAccessToken() { throw new Error('no token') } },
  })

  await assert.rejects(
    permissions.requireAuth({ headers: new Headers() }),
    (error) => error instanceof permissions.ApiError && error.statusCode === 401
  )
})

test('requireCompanyAccess blocks company A from company B', async () => {
  const permissions = loadWithMocks('../../lib/permissions', {
    '@/lib/db/prisma': {
      companyUser: {
        async findUnique() {
          return null
        },
      },
    },
    '@/lib/auth/jwt': { verifyAccessToken() { throw new Error('unused') } },
  })

  await assert.rejects(
    permissions.requireCompanyAccess(
      {
        userId: 'user-a',
        email: 'a@example.com',
        roles: ['SUPPLIER_OWNER'],
        permissions: [],
        companyId: 'company-a',
      },
      'company-b'
    ),
    (error) => error instanceof permissions.ApiError && error.statusCode === 403
  )
})

test('trade orders GET blocks users without marketplace roles', async () => {
  const permissions = createPermissionsMock({
    requireAuth: async () => ({
      userId: 'guest-1',
      email: 'guest@example.com',
      roles: ['GUEST'],
      permissions: [],
    }),
  })
  const route = loadWithMocks('../../app/api/trade-orders/route', {
    '@/lib/permissions': permissions,
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {
      tradeOrder: {
        async findMany() {
          throw new Error('should not query trade orders')
        },
        async count() {
          throw new Error('should not count trade orders')
        },
      },
    },
    '@/lib/trade/create-trade-order': { createTradeOrderFromQuotation: async () => ({}) },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { ORDER_CREATE: 'ORDER_CREATE' } },
  })

  const response = await route.GET({ url: 'http://localhost/api/trade-orders', headers: new Headers() })
  const payload = await response.json()

  assert.equal(response.status, 403)
  assert.equal(payload.success, false)
})

test('unverified supplier cannot create a product', async () => {
  const permissions = createPermissionsMock()
  permissions.requireVerifiedSupplier = async () => {
    throw new permissions.ApiError(403, 'Supplier verification required')
  }
  const route = loadWithMocks('../../app/api/products/route', {
    '@/lib/permissions': permissions,
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {},
    '@/lib/utils/audit': { logCreate: async () => {} },
    '@/lib/search': { indexProduct: async () => {} },
    '@/lib/utils/slug': { uniqueSlug: async () => 'sample-product' },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { PRODUCT_CREATE: 'PRODUCT_CREATE' } },
  })

  const response = await route.POST(createRequest('http://localhost/api/products', {
    companyId: 'company-a',
    categoryId: 'category-1',
    name: 'Sample Product',
  }))
  const payload = await response.json()

  assert.equal(response.status, 403)
  assert.equal(payload.success, false)
})

test('unverified supplier cannot create a quotation', async () => {
  const permissions = createPermissionsMock()
  permissions.requireVerifiedSupplier = async () => {
    throw new permissions.ApiError(403, 'Supplier verification required')
  }
  const route = loadWithMocks('../../app/api/quotations/route', {
    '@/lib/permissions': permissions,
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {},
    '@/server/services/notification': { createNotification: async () => {} },
    '@/lib/email': { sendQuotationEmail: async () => {} },
    '@/lib/rfqs/visibility': { isPubliclyVisibleRFQStatus: () => true },
    '@/lib/analytics/tracking': { trackQuotationCreated: async () => {} },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { QUOTATION_CREATE: 'QUOTATION_CREATE' } },
  })

  const response = await route.POST(createRequest('http://localhost/api/quotations', {
    rfqId: 'rfq-1',
    companyId: 'company-a',
    totalPrice: 100,
    currencyCode: 'USD',
    deliveryTime: '10 days',
    notes: 'This is a valid quotation note.',
    items: [
      {
        description: 'Line item',
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
      },
    ],
  }))
  const payload = await response.json()

  assert.equal(response.status, 403)
  assert.equal(payload.success, false)
})

test('unverified buyer cannot create an RFQ', async () => {
  const permissions = createPermissionsMock({
    requireAuth: async () => ({
      userId: 'buyer-1',
      email: 'buyer@example.com',
      roles: ['BUYER'],
      permissions: [],
    }),
  })
  permissions.requireVerifiedBuyer = async () => {
    throw new permissions.ApiError(403, 'Buyer verification required')
  }
  const route = loadWithMocks('../../app/api/rfqs/route', {
    '@/lib/permissions': permissions,
    '@/lib/utils/api': apiUtilsMock,
    '@/lib/db/prisma': {},
    '@/server/services/notification': { createNotification: async () => {} },
    '@/lib/email': { sendNewRFQEmail: async () => {} },
    '@/lib/ai/rfq-matching': { getAiMatchedSupplierOwnersForRFQ: async () => [] },
    '@/lib/rfqs/visibility': { buildPublicActiveRFQWhere: () => ({}) },
    '@/lib/analytics/tracking': { trackCompanyRfqs: async () => {} },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { RFQ_CREATE: 'RFQ_CREATE' } },
  })

  const response = await route.POST(createRequest('http://localhost/api/rfqs', {
    productName: 'Steel coils',
    quantity: '100',
    isPublic: true,
  }))
  const payload = await response.json()

  assert.equal(response.status, 403)
  assert.equal(payload.success, false)
})

test('chat room access helper blocks unauthorized socket room joins', async () => {
  const permissions = loadWithMocks('../../lib/permissions', {
    '@/lib/auth/jwt': { verifyAccessToken() { throw new Error('unused') } },
    '@/lib/db/prisma': {
      chatRoom: {
        async findUnique() {
          return {
            id: 'room-1',
            companyId: 'company-a',
            inquiryId: null,
            participants: [
              {
                userId: 'buyer-1',
                isAdmin: false,
                isBlocked: false,
                user: { roles: [{ role: { name: 'BUYER' } }] },
              },
            ],
          }
        },
      },
    },
  })

  await assert.rejects(
    permissions.requireChatRoomAccess({
      user: {
        userId: 'intruder-1',
        roles: ['BUYER'],
      },
      roomId: 'room-1',
    }),
    (error) => error instanceof permissions.ApiError && error.statusCode === 403
  )
})
