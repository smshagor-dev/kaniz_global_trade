const test = require('node:test')
const assert = require('node:assert/strict')

require('ts-node/register/transpile-only')
require('tsconfig-paths/register')

const { normalizeProductImages } = require('../../lib/products/images')

test('normalizeProductImages keeps the first explicit primary image only', () => {
  const result = normalizeProductImages([
    { url: 'https://cdn.example.com/one.webp', isPrimary: true, alt: '  One  ' },
    { url: 'https://cdn.example.com/two.webp', isPrimary: true, alt: 'Two' },
    { url: 'https://cdn.example.com/three.webp', alt: 'Three' },
  ])

  assert.equal(result.length, 3)
  assert.deepEqual(
    result.map((image) => image.isPrimary),
    [true, false, false]
  )
  assert.equal(result[0].alt, 'One')
})

test('normalizeProductImages promotes the first image when none are marked primary', () => {
  const result = normalizeProductImages([
    { url: 'https://cdn.example.com/one.webp' },
    { url: 'https://cdn.example.com/two.webp' },
  ])

  assert.deepEqual(
    result.map((image) => image.isPrimary),
    [true, false]
  )
})

test('normalizeProductImages drops duplicate urls and blank alt text', () => {
  const result = normalizeProductImages([
    { url: 'https://cdn.example.com/one.webp', alt: '   ' },
    { url: 'https://cdn.example.com/one.webp', isPrimary: true, alt: 'Duplicate' },
    { url: 'https://cdn.example.com/two.webp', alt: 'Second' },
  ])

  assert.equal(result.length, 2)
  assert.equal(result[0].alt, null)
  assert.equal(result[1].alt, 'Second')
})
