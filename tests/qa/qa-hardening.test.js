const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
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

test('max pagination limit is enforced at 50', () => {
  const { getPaginationParams, MAX_API_PAGE_SIZE } = require('../../lib/utils/api')
  const params = new URLSearchParams({ page: '2', limit: '999' })

  const result = getPaginationParams(params)

  assert.equal(result.page, 2)
  assert.equal(result.limit, MAX_API_PAGE_SIZE)
  assert.equal(result.skip, 50)
})

test('step 6 indexes exist in Prisma schema and migration', () => {
  const schema = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
  const migration = fs.readFileSync(path.join(process.cwd(), 'prisma/migrations/20260702150000_step6_qa_hardening/migration.sql'), 'utf8')

  assert.match(schema, /@@index\(\[companyId, status, createdAt\]\)/)
  assert.match(schema, /@@index\(\[userId, isRead, createdAt\]\)/)
  assert.match(schema, /@@index\(\[status, isPublic, expiresAt\]\)/)
  assert.match(migration, /CREATE INDEX `Product_companyId_status_createdAt_idx`/)
  assert.match(migration, /CREATE INDEX `Notification_userId_isRead_createdAt_idx`/)
  assert.match(migration, /CREATE INDEX `Shipment_supplierCompanyId_status_updatedAt_idx`/)
})

test('cache invalidation clears product, company, and RFQ public cache groups', async () => {
  const patterns = []
  const cache = loadWithMocks('../../lib/cache/public', {
    '@/lib/db/redis': {
      getCache: async () => null,
      setCache: async () => {},
      deleteCachePattern: async (pattern) => {
        patterns.push(pattern)
      },
    },
  })

  await cache.invalidateProductCaches('product-1', 'solar-panel')
  await cache.invalidateCompanyCaches('company-1', 'acme-export')
  await cache.invalidateRFQCaches()

  assert.deepEqual(patterns, [
    'public:homepage:*',
    'public:product:*',
    'public:product:product-1',
    'public:product:solar-panel',
    'public:homepage:*',
    'public:company:*',
    'public:company:company-1',
    'public:company:acme-export',
    'public:rfq-board:*',
  ])
})

test('queue failure logging stores recent failures and retry policy stays enabled', async () => {
  const redisState = []
  const failureLog = loadWithMocks('../../server/queues/failure-log', {
    '@/lib/db/redis': {
      lpush: async (_key, value) => {
        redisState.unshift(value)
      },
      ltrim: async (_key, start, end) => {
        redisState.splice(end + 1)
      },
      lrange: async (_key, start, end) => redisState.slice(start, end + 1),
    },
  })
  const { defaultJobOptions } = require('../../server/queues/config')

  await failureLog.recordQueueFailure({
    queue: 'search',
    jobId: 'job-1',
    jobName: 'sync-search-document',
    attemptsMade: 5,
    failedReason: 'boom',
    payload: { entityType: 'rfq', entityId: 'rfq-1', action: 'upsert' },
    failedAt: '2026-07-02T10:00:00.000Z',
  })

  const failures = await failureLog.getRecentQueueFailures(5)

  assert.equal(defaultJobOptions.attempts, 5)
  assert.equal(defaultJobOptions.backoff.type, 'exponential')
  assert.equal(defaultJobOptions.backoff.delay, 5000)
  assert.equal(failures.length, 1)
  assert.equal(failures[0].queue, 'search')
  assert.equal(failures[0].failedReason, 'boom')
})

test('RFQ search sync removes stale records when an RFQ is unpublished or deleted', async () => {
  const removed = []
  const sync = loadWithMocks('../../lib/search/sync', {
    '@/lib/db/prisma': {
      rFQ: {
        findUnique: async () => ({
          id: 'rfq-1',
          productName: 'Copper Wire',
          quantity: '100',
          unit: 'kg',
          budget: null,
          status: 'CANCELLED',
          isPublic: false,
          expiresAt: null,
          createdAt: new Date('2026-07-02T10:00:00.000Z'),
          deletedAt: new Date('2026-07-02T11:00:00.000Z'),
          quotationCount: 0,
          buyerId: 'buyer-1',
          categoryId: null,
          destinationCountryId: null,
          currencyId: null,
          description: null,
          category: null,
          destinationCountry: null,
          currency: null,
        }),
      },
    },
    '@/lib/search': {
      indexProduct: async () => {},
      removeProductFromIndex: async () => {},
      indexCompany: async () => {},
      removeCompanyFromIndex: async () => {},
      indexRFQ: async () => {
        throw new Error('should not index hidden RFQ')
      },
      removeRFQFromIndex: async (id) => {
        removed.push(id)
      },
    },
    '@/lib/rfqs/visibility': {
      isPubliclyVisibleRFQStatus: () => false,
    },
    '@/server/queues/client': {
      enqueueSearchSync: async () => {},
    },
  })

  await sync.processSearchSyncJob('rfq', 'rfq-1', 'upsert')
  await sync.processSearchSyncJob('rfq', 'rfq-2', 'remove')

  assert.deepEqual(removed, ['rfq-1', 'rfq-2'])
})
