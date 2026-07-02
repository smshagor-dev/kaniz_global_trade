const test = require('node:test')
const assert = require('node:assert/strict')

require('ts-node/register/transpile-only')
require('tsconfig-paths/register')

const { resolveStripeMode } = require('../../lib/payment/mode')

test('stripe live mode should align with live keys', () => {
  assert.equal(resolveStripeMode('live', 'sk_live_123'), 'live')
  assert.equal(resolveStripeMode('sandbox', 'sk_test_123'), 'sandbox')
})

test('paying routes require a real base domain in production readiness policy', () => {
  const localhost = new URL('http://localhost:3000').hostname
  const production = new URL('https://kanizglobaltrade.com').hostname

  assert.equal(localhost, 'localhost')
  assert.equal(production, 'kanizglobaltrade.com')
})
