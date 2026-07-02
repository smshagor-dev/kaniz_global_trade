const test = require('node:test')
const assert = require('node:assert/strict')

require('ts-node/register/transpile-only')
require('tsconfig-paths/register')

const { buildAppUrl, resolveAppUrl } = require('../../lib/payment/urls')

test('resolveAppUrl trims a trailing slash', () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL
  process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/'

  try {
    assert.equal(resolveAppUrl(), 'https://example.com')
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = previous
  }
})

test('buildAppUrl appends the path and search params', () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL
  process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'

  try {
    assert.equal(
      buildAppUrl('/payment-return/packages', { payment: 'success', gateway: 'stripe' }),
      'https://example.com/payment-return/packages?payment=success&gateway=stripe'
    )
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = previous
  }
})

test('resolveAppUrl rejects missing values', () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL
  process.env.NEXT_PUBLIC_APP_URL = ''

  try {
    assert.throws(() => resolveAppUrl(), /NEXT_PUBLIC_APP_URL is required/)
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = previous
  }
})
