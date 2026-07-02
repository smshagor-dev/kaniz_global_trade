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

test('health report returns degraded when dependencies fail', async () => {
  const { buildSystemHealthReport } = loadWithMocks('../../lib/monitoring/health', {
    '@/lib/monitoring/system-events': {
      recordSystemEvent: async () => {},
    },
  })

  const report = await buildSystemHealthReport({
    app: async () => ({ name: 'app', status: 'healthy', message: 'ok', latencyMs: 0 }),
    database: async () => ({ name: 'database', status: 'down', message: 'db failed', latencyMs: 3 }),
    redis: async () => ({ name: 'redis', status: 'degraded', message: 'redis slow', latencyMs: 2 }),
    search: async () => ({ name: 'search', status: 'healthy', message: 'ok', latencyMs: 1 }),
    socket: async () => ({ name: 'socket', status: 'healthy', message: 'ok', latencyMs: 1 }),
    queue: async () => ({ name: 'queue-workers', status: 'healthy', message: 'ok', latencyMs: 1 }),
    storage: async () => ({ name: 'storage', status: 'healthy', message: 'ok', latencyMs: 1 }),
  })

  assert.equal(report.status, 'down')
  assert.equal(report.services.find((item) => item.name === 'database').status, 'down')
  assert.equal(report.services.find((item) => item.name === 'redis').status, 'degraded')
})

test('admin-only access is enforced for system dashboard', async () => {
  const req = { headers: { get: () => 'Bearer token' } }

  const forbiddenRoute = loadWithMocks('../../app/api/admin/system-dashboard/route', {
    '@/lib/permissions': {
      requireAdmin: async () => {
        const error = new Error('Kaniz Global Trade team access required')
        error.statusCode = 403
        throw error
      },
    },
    '@/lib/utils/api': {
      successResponse: (data, message) => ({ status: 200, json: async () => ({ success: true, message, data }) }),
      handleApiError: (error) => ({ status: error.statusCode || 500, json: async () => ({ success: false, message: error.message }) }),
    },
    '@/lib/monitoring/dashboard': {
      getSystemDashboardSnapshot: async () => ({ generatedAt: '2026-07-02T00:00:00.000Z' }),
    },
  })

  const forbidden = await forbiddenRoute.GET(req)
  const forbiddenBody = await forbidden.json()
  assert.equal(forbidden.status, 403)
  assert.match(forbiddenBody.message, /access required/i)

  const allowedRoute = loadWithMocks('../../app/api/admin/system-dashboard/route', {
    '@/lib/permissions': {
      requireAdmin: async () => ({ userId: 'admin-1' }),
    },
    '@/lib/utils/api': {
      successResponse: (data, message) => ({ status: 200, json: async () => ({ success: true, message, data }) }),
      handleApiError: (error) => ({ status: error.statusCode || 500, json: async () => ({ success: false, message: error.message }) }),
    },
    '@/lib/monitoring/dashboard': {
      getSystemDashboardSnapshot: async () => ({ generatedAt: '2026-07-02T00:00:00.000Z', health: { status: 'healthy' } }),
    },
  })

  const allowed = await allowedRoute.GET(req)
  const allowedBody = await allowed.json()
  assert.equal(allowed.status, 200)
  assert.equal(allowedBody.data.health.status, 'healthy')
})

test('structured failure events are written for payment, upload, and queue failures', async () => {
  const writes = []
  const events = loadWithMocks('../../lib/monitoring/event-helpers', {
    '@/lib/monitoring/system-events': {
      recordSystemEvent: async (payload) => writes.push(payload),
    },
  })

  await events.logPaymentWebhookFailureEvent({
    provider: 'STRIPE',
    message: 'Stripe webhook failed.',
    reason: 'invalid_signature',
    paymentId: 'pay-1',
  })
  await events.logUploadRejectEvent({
    actorUserId: 'user-1',
    purpose: 'company_doc',
    filename: 'invoice.exe',
    message: 'Upload rejected.',
    reason: 'blocked_extension',
  })

  const failures = loadWithMocks('../../server/queues/failure-log', {
    '@/lib/db/redis': {
      lpush: async () => {},
      ltrim: async () => {},
      lrange: async () => [],
    },
    '@/lib/monitoring/system-events': {
      recordSystemEvent: async (payload) => writes.push(payload),
    },
  })

  await failures.recordQueueFailure({
    queue: 'search',
    jobId: 'job-1',
    jobName: 'sync-search-document',
    attemptsMade: 5,
    failedReason: 'boom',
    payload: { entityId: 'rfq-1' },
    failedAt: '2026-07-02T00:00:00.000Z',
  })

  assert.equal(writes.length, 3)
  assert.equal(writes[0].category, 'WEBHOOK')
  assert.equal(writes[1].category, 'UPLOAD')
  assert.equal(writes[2].category, 'QUEUE')
})

test('backup script and readiness docs exist', () => {
  const requiredPaths = [
    'scripts/backup/mysql-backup.ps1',
    'PRODUCTION_LAUNCH_CHECKLIST.md',
    'INCIDENT_RESPONSE.md',
    'BACKUP_RESTORE.md',
  ]

  for (const relativePath of requiredPaths) {
    const absolutePath = path.join(process.cwd(), relativePath)
    assert.equal(fs.existsSync(absolutePath), true, `${relativePath} should exist`)
  }
})
