import test from 'node:test'
import assert from 'node:assert/strict'
import { canTransition, customerCanCancel, restocksOnCancel } from '../services/orderStatus.js'
import { computeTotals, couponDiscount, checkCoupon } from '../services/pricing.js'
import { findZone } from '../services/zones.js'
import { convertFromBase } from '../services/currency.js'
import { escapeRegex, slugify, parsePagination } from '../utils/helpers.js'

const zones = [
  { name: 'Dhaka', countries: ['BD'], regions: ['Dhaka'], baseFee: 80, expressFee: 160, freeThreshold: 5000, codAvailable: true, isActive: true },
  { name: 'Outside Dhaka', countries: ['BD'], regions: [], baseFee: 130, expressFee: null, freeThreshold: 8000, codAvailable: true, isActive: true },
  { name: 'World', countries: ['*'], regions: [], baseFee: 4800, expressFee: null, freeThreshold: 0, codAvailable: false, isActive: true },
]
const lines = [
  { productId: 'p1', categoryId: 'c1', lineTotal: 4000 },
  { productId: 'p2', categoryId: 'c2', lineTotal: 2000 },
]

test('order status transitions', () => {
  assert.equal(canTransition('Pending', 'Confirmed'), true)
  assert.equal(canTransition('Pending', 'Delivered'), true) // forward skips allowed for admins
  assert.equal(canTransition('Processing', 'Pending'), false)
  assert.equal(canTransition('Pending', 'Cancelled'), true)
  assert.equal(canTransition('Shipped', 'Cancelled'), false)
  assert.equal(canTransition('Shipped', 'Returned'), true)
  assert.equal(canTransition('Delivered', 'Returned'), true)
  assert.equal(canTransition('Cancelled', 'Pending'), false)
  assert.equal(canTransition('Returned', 'Delivered'), false)
  assert.equal(canTransition('Pending', 'Nonsense'), false)
  assert.equal(customerCanCancel('Pending'), true)
  assert.equal(customerCanCancel('Processing'), false)
  assert.equal(restocksOnCancel('Processing'), true)
})

test('zone matching prefers region, falls back to country, then world', () => {
  assert.equal(findZone(zones, 'BD', 'dhaka').name, 'Dhaka')
  assert.equal(findZone(zones, 'BD', 'Sylhet').name, 'Outside Dhaka')
  assert.equal(findZone(zones, 'US', 'Austin').name, 'World')
  assert.equal(findZone(zones.slice(0, 2), 'US', 'Austin'), null)
  assert.equal(findZone(zones.map((z) => ({ ...z, isActive: false })), 'BD', 'Dhaka'), null)
})

test('totals: free shipping threshold, express, coupons', () => {
  const dhaka = zones[0]
  let t = computeTotals({ lines, zone: dhaka })
  assert.deepEqual(t, { subtotal: 6000, discount: 0, shipping: 0, total: 6000 })
  t = computeTotals({ lines, zone: dhaka, method: 'express' })
  assert.equal(t.shipping, 160)
  const coupon = { active: true, type: 'percent', value: 10, minPurchase: 0, usageLimit: 0, usedCount: 0, appliesTo: { type: 'all' } }
  t = computeTotals({ lines, zone: dhaka, coupon })
  assert.deepEqual(t, { subtotal: 6000, discount: 600, shipping: 0, total: 5400 })
  // discount pushes the order under the free-shipping threshold
  t = computeTotals({ lines, zone: dhaka, coupon: { ...coupon, value: 20 } })
  assert.equal(t.shipping, 80)
  assert.throws(() => computeTotals({ lines, zone: zones[1], method: 'express' }), /Express delivery is not available/)
})

test('coupon rules', () => {
  const base = { active: true, type: 'fixed', value: 500, minPurchase: 5000, usageLimit: 2, usedCount: 0, appliesTo: { type: 'all' } }
  assert.equal(checkCoupon(base, { subtotal: 4000, eligible: 4000 }) !== null, true)
  assert.equal(checkCoupon(base, { subtotal: 6000, eligible: 6000 }), null)
  assert.match(checkCoupon({ ...base, usedCount: 2 }, { subtotal: 6000, eligible: 6000 }), /usage limit/)
  assert.match(checkCoupon({ ...base, expiresAt: new Date('2020-01-01') }, { subtotal: 6000, eligible: 6000 }), /expired/)
  assert.match(checkCoupon({ ...base, perUserLimit: 1 }, { subtotal: 6000, eligible: 6000, userUses: 1 }), /already used/)
  assert.equal(checkCoupon({ ...base, active: false }, { subtotal: 6000, eligible: 6000 }) !== null, true)
  assert.equal(couponDiscount({ type: 'percent', value: 50, maxDiscount: 1000 }, 6000), 1000)
  assert.equal(couponDiscount({ type: 'fixed', value: 9000 }, 6000), 6000) // never more than eligible amount
  const scoped = { ...base, minPurchase: 0, appliesTo: { type: 'categories', ids: ['c2'] } }
  const t = computeTotals({ lines, zone: zones[0], coupon: scoped })
  assert.equal(t.discount, 500)
})

test('currency conversion needs a real rate and keeps decimals', () => {
  assert.equal(convertFromBase(10000, { rate: 0.0082, decimals: 2 }), 82)
  assert.equal(convertFromBase(12345, { rate: 1, decimals: 0 }), 12345)
  assert.throws(() => convertFromBase(100, { rate: 0, decimals: 2 }))
  assert.throws(() => convertFromBase(100, null))
})

test('helpers', () => {
  assert.equal(escapeRegex('a.b(c)'), 'a\\.b\\(c\\)')
  assert.equal(slugify('  Galaxy S24 Ultra 256GB! '), 'galaxy-s24-ultra-256gb')
  assert.deepEqual(parsePagination({ page: '3', limit: '500' }), { page: 3, limit: 48, skip: 96 })
  assert.deepEqual(parsePagination({}), { page: 1, limit: 12, skip: 0 })
})
