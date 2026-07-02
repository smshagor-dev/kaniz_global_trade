const test = require('node:test')
const assert = require('node:assert/strict')

require('ts-node/register/transpile-only')
require('tsconfig-paths/register')

const {
  clampRiskScore,
  FRAUD_ACTIONS,
  publicFlagFromRisk,
  restrictionsForRisk,
  riskLevelFromScore,
} = require('../../lib/fraud/shared')

test('risk score thresholds map to expected fraud levels', () => {
  assert.equal(riskLevelFromScore(0), 'SAFE')
  assert.equal(riskLevelFromScore(18), 'LOW')
  assert.equal(riskLevelFromScore(40), 'MEDIUM')
  assert.equal(riskLevelFromScore(60), 'HIGH')
  assert.equal(riskLevelFromScore(80), 'CRITICAL')
  assert.equal(riskLevelFromScore(99), 'BLOCKED')
})

test('high and blocked levels expose strict public flags and restrictions', () => {
  assert.equal(publicFlagFromRisk('HIGH'), 'LIMITED_ACCESS')
  assert.equal(publicFlagFromRisk('BLOCKED'), 'BLOCKED')
  assert.ok(restrictionsForRisk('HIGH').includes(FRAUD_ACTIONS.PRODUCT_CREATE))
  assert.ok(restrictionsForRisk('BLOCKED').includes(FRAUD_ACTIONS.ORDER_CREATE))
})

test('risk score clamp keeps values in 0..100', () => {
  assert.equal(clampRiskScore(-10), 0)
  assert.equal(clampRiskScore(140), 100)
  assert.equal(clampRiskScore(44.6), 45)
})
