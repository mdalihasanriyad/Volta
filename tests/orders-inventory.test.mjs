// Business-logic tests for orders, inventory, returns and reviews, run against the in-memory database in helpers/fakeDb.mjs.
import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { install, seedBasic } from './helpers/fakeDb.mjs'
import { cancelOrder, changeStatus, placeOrder, quote, requestReturn, resolveLines } from '../services/orderService.js'
import { adminAdjust } from '../services/inventoryService.js'
import { addVariantToProduct } from '../services/productService.js'
import { createReview } from '../services/reviewService.js'

console.log = () => {} // emails are "printed" instead of sent when no Resend key is set
let db
const user = { _id: 'u1', name: 'Ana Rahman', email: 'ana@mail.example' }
const admin = { _id: 'a1', name: 'Nadia' }
const address = { fullName: 'Ana Rahman', phone: '01711111111', country: 'BD', city: 'Dhaka', line1: 'House 1, Road 2' }
const body = (o = {}) => ({ items: [{ product: 'p1', quantity: 1 }], deliveryMethod: 'standard', shippingAddress: address, acceptCod: true, ...o })
const inv = (sku = 'SKU-1') => db.Inventory.find((i) => i.sku === sku)

beforeEach(() => { db = install(); seedBasic(db) })

test('order placement: prices come from the database, stock drops, snapshots are frozen', async () => {
  db.Cart.push({ _id: 'c1', user: 'u1', items: [] })
  const o = await placeOrder(user, body({ currency: 'USD', items: [{ product: 'p1', quantity: 2, color: 'Black', unitPrice: 1, price: 1 }], total: 1 }))
  assert.equal(o.subtotal, 2000)
  assert.equal(o.shippingFee, 80)
  assert.equal(o.total, 2080)
  assert.equal(o.totalDisplay, 17.06)                       // 2080 BDT at 0.0082, rounded to 2 decimals
  assert.deepEqual({ code: o.currency.code, rate: o.currency.rate }, { code: 'USD', rate: 0.0082 })
  assert.deepEqual(o.payment, { method: 'COD', status: 'unpaid' })
  assert.equal(o.status, 'Pending')
  assert.equal(o.items[0].unitPrice, 1000)                  // never the browser's price
  assert.equal(o.items[0].color, 'Black')
  assert.match(o.number, /^VLT-\d{10}$/)
  assert.equal(inv().quantity, 1)
  assert.equal(db.Product[0].stock, 1)
  assert.equal(db.Product[0].soldCount, 2)
  assert.deepEqual(db.StockMovement.map((m) => [m.type, m.quantity, m.balanceAfter, m.reference]), [['sale', -2, 1, o.number]])
  assert.equal(db.Cart.length, 0)                            // the saved cart is cleared
  assert.deepEqual(db.Notification.map((n) => n.type).sort(), ['order', 'stock'])
  db.Currency[1].rate = 0.5                                  // a later rate change must not touch the stored order
  assert.equal(db.Order[0].totalDisplay, 17.06)
  assert.equal(db.Order[0].currency.rate, 0.0082)
})

test('free delivery applies above the zone threshold; express uses its own fee', async () => {
  db.Product[0].price = 6000
  assert.equal((await placeOrder(user, body())).shippingFee, 0)
  db.Product[0].price = 1000
  assert.equal((await placeOrder(user, body({ deliveryMethod: 'express' }))).shippingFee, 160)
})

test('not enough stock: 409, nothing is created, nothing is deducted', async () => {
  await assert.rejects(() => placeOrder(user, body({ items: [{ product: 'p1', quantity: 5 }] })), (e) => e.status === 409)
  assert.equal(inv().quantity, 3)
  assert.equal(db.Order.length, 0)
  assert.equal(db.StockMovement.length, 0)
})

test('a failure on the second line rolls back the first line', async () => {
  db.Product.push({ _id: 'p2', name: 'Case', sku: 'SKU-2', status: 'active', price: 500, category: 'c1', hasVariants: false, images: [], colors: [], stock: 0 })
  db.Inventory.push({ _id: 'i2', sku: 'SKU-2', product: 'p2', quantity: 0, reorderLevel: 2 })
  await assert.rejects(() => placeOrder(user, body({ items: [{ product: 'p1', quantity: 1 }, { product: 'p2', quantity: 1 }] })), (e) => e.status === 409)
  assert.equal(inv('SKU-1').quantity, 3)
  assert.equal(db.StockMovement.length, 0)
  assert.equal(db.Product[0].soldCount, 0)
})

test('10 simultaneous orders for 3 units: exactly 3 succeed, stock never goes negative', async () => {
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => placeOrder(user, body())))
  const ok = results.filter((r) => r.status === 'fulfilled')
  const failed = results.filter((r) => r.status === 'rejected')
  assert.equal(ok.length, 3)
  assert.ok(failed.every((r) => r.reason.status === 409))
  assert.equal(inv().quantity, 0)
  assert.equal(db.Order.length, 3)
  assert.equal(db.StockMovement.length, 3)
  assert.equal(db.Product[0].soldCount, 3)
  assert.equal(db.Product[0].stock, 0)
})

test('a coupon with a usage limit of 1 is used once even when orders race; losing orders are rolled back', async () => {
  db.Inventory[0].quantity = 50; db.Product[0].stock = 50
  db.Coupon.push({ _id: 'k1', code: 'ONCE', type: 'percent', value: 10, active: true, usageLimit: 1, usedCount: 0, appliesTo: { type: 'all' } })
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => placeOrder(user, body({ couponCode: 'once' }))))
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
  assert.ok(results.filter((r) => r.status === 'rejected').every((r) => r.reason.status === 409))
  assert.equal(db.Coupon[0].usedCount, 1)
  assert.equal(inv().quantity, 49)                           // the 4 failed orders gave their stock back
  assert.equal(db.Order[0].discount, 100)
})

test('per-customer coupon limit is enforced', async () => {
  db.Coupon.push({ _id: 'k2', code: 'ONEEACH', type: 'fixed', value: 100, active: true, usageLimit: 0, perUserLimit: 1, usedCount: 0, appliesTo: { type: 'all' } })
  db.Inventory[0].quantity = 9; db.Product[0].stock = 9
  await placeOrder(user, body({ couponCode: 'ONEEACH' }))
  await assert.rejects(() => placeOrder(user, body({ couponCode: 'ONEEACH' })), (e) => e.status === 422 && /already used/.test(e.message))
  assert.equal(inv().quantity, 8)
})

test('COD unavailable or undeliverable destinations are refused without touching stock', async () => {
  await assert.rejects(() => placeOrder(user, body({ shippingAddress: { ...address, country: 'US', city: 'Austin' } })), (e) => e.status === 422 && /Cash on Delivery is not available/.test(e.message))
  db.ShippingZone.splice(2, 1) // no worldwide zone any more
  await assert.rejects(() => placeOrder(user, body({ shippingAddress: { ...address, country: 'US', city: 'Austin' } })), (e) => e.status === 422 && /do not deliver/.test(e.message))
  const q1 = await quote(user, { items: [{ product: 'p1', quantity: 1 }], deliveryMethod: 'standard', shippingAddress: { country: 'US', city: 'Austin' } })
  assert.equal(q1.deliverable, false)
  assert.equal(inv().quantity, 3)
  assert.equal(db.Order.length, 0)
})

test('quote reports COD availability, stock issues and converted amounts', async () => {
  const ok = await quote(user, { items: [{ product: 'p1', quantity: 2 }], deliveryMethod: 'standard', currency: 'USD', shippingAddress: { country: 'BD', city: 'dhaka' } })
  assert.equal(ok.deliverable, true)
  assert.equal(ok.cod.available, true)
  assert.equal(ok.totals.total, 2080)
  assert.equal(ok.display.total, 17.06)
  const low = await quote(user, { items: [{ product: 'p1', quantity: 4 }], deliveryMethod: 'standard', shippingAddress: { country: 'BD', city: 'Sylhet' } })
  assert.equal(low.issues.length, 1)
  assert.equal(low.totals.shipping, 130)                     // "Outside" zone
  await assert.rejects(() => quote(user, { items: [{ product: 'p1', quantity: 1 }], deliveryMethod: 'standard', currency: 'EUR', shippingAddress: { country: 'BD', city: 'Dhaka' } }), (e) => e.status === 422)
})

test('line resolution: variants are required, colours must be offered, limits apply', async () => {
  db.Product[0].hasVariants = true
  db.ProductVariant.push({ _id: 'v1', product: 'p1', sku: 'SKU-1-A', model: '256GB', price: 1200, isActive: true })
  await assert.rejects(() => resolveLines([{ product: 'p1', quantity: 1 }]), (e) => e.status === 422)
  const [line] = await resolveLines([{ product: 'p1', variant: 'v1', quantity: 2, color: 'Purple' }])
  assert.equal(line.unitPrice, 1200)
  assert.equal(line.color, undefined)                        // "Purple" is not a colour of this product
  assert.equal(line.sku, 'SKU-1-A')
  await assert.rejects(() => resolveLines([{ product: 'p1', variant: 'v1', quantity: 6 }, { product: 'p1', variant: 'v1', quantity: 6 }]), (e) => /at most 10/.test(e.message))
  db.Product[0].status = 'draft'
  await assert.rejects(() => resolveLines([{ product: 'p1', variant: 'v1', quantity: 1 }]), (e) => e.status === 422)
})

test('cancelling restores stock, popularity and coupon use; it works once', async () => {
  db.Coupon.push({ _id: 'k1', code: 'TEN', type: 'percent', value: 10, active: true, usageLimit: 0, usedCount: 0, appliesTo: { type: 'all' } })
  const o = await placeOrder(user, body({ couponCode: 'TEN', items: [{ product: 'p1', quantity: 2 }] }))
  assert.equal(inv().quantity, 1)
  assert.equal(db.Coupon[0].usedCount, 1)
  const c = await cancelOrder(o, 'Nadia')
  assert.equal(c.status, 'Cancelled')
  assert.equal(inv().quantity, 3)
  assert.equal(db.Product[0].soldCount, 0)
  assert.equal(db.Coupon[0].usedCount, 0)
  assert.deepEqual(db.StockMovement.map((m) => m.type), ['sale', 'cancel_restore'])
  await assert.rejects(() => cancelOrder(o, 'Nadia'), (e) => e.status === 409) // already cancelled
  assert.equal(inv().quantity, 3)                                              // no double restock
})

test('cancellation rules: customers only before processing, nobody after shipping', async () => {
  const o = await placeOrder(user, body())
  await changeStatus(o, 'Confirmed', 'Nadia')
  assert.equal(db.Order[0].status, 'Confirmed')
  const c = await cancelOrder({ ...o, status: 'Confirmed' }, 'customer', { byCustomer: true })
  assert.equal(c.status, 'Cancelled')
  const o2 = await placeOrder(user, body())
  await changeStatus(o2, 'Processing', 'Nadia')
  await assert.rejects(() => cancelOrder({ ...o2, status: 'Processing' }, 'customer', { byCustomer: true }), (e) => e.status === 403)
  await changeStatus({ ...o2, status: 'Processing' }, 'Shipped', 'Nadia')
  await assert.rejects(() => cancelOrder({ ...o2, status: 'Shipped' }, 'Nadia'), (e) => e.status === 409)
})

test('status workflow: only valid steps, delivery marks COD paid, returns open a refund', async () => {
  const o = await placeOrder(user, body())
  await assert.rejects(() => changeStatus(o, 'Returned', 'Nadia'), (e) => e.status === 422)
  const stale = { ...o, status: 'Processing' } // someone else already moved it: the conditional update must refuse
  await assert.rejects(() => changeStatus(stale, 'Shipped', 'Nadia'), (e) => e.status === 409)
  let cur = await changeStatus(o, 'Shipped', 'Nadia')
  cur = await changeStatus(cur, 'Out for Delivery', 'Nadia')
  assert.equal(cur.payment.status, 'unpaid')
  cur = await changeStatus(cur, 'Delivered', 'Nadia')
  assert.equal(cur.payment.status, 'paid')
  assert.ok(cur.deliveredAt)
  assert.deepEqual(cur.statusHistory.map((h) => h.status), ['Pending', 'Shipped', 'Out for Delivery', 'Delivered'])
  const back = await changeStatus(cur, 'Returned', 'Nadia')
  assert.equal(back.refund.status, 'pending')
  await assert.rejects(() => changeStatus(back, 'Delivered', 'Nadia'), (e) => e.status === 422)
})

test('return requests: delivered only, once, within 7 days', async () => {
  const mk = (o) => ({ ...o, save: async () => {} })
  await assert.rejects(() => requestReturn(mk({ status: 'Shipped', payment: {} }), 'broken screen'), (e) => e.status === 403)
  const fresh = mk({ number: 'X', status: 'Delivered', deliveredAt: new Date(), payment: {} })
  assert.equal((await requestReturn(fresh, 'broken screen')).returnRequest.status, 'requested')
  await assert.rejects(() => requestReturn(fresh, 'again'), (e) => e.status === 409)
  await assert.rejects(() => requestReturn(mk({ status: 'Delivered', deliveredAt: new Date(Date.now() - 8 * 86400000), payment: {} }), 'too late'), (e) => e.status === 403)
})

test('admin stock changes: never negative, always audited', async () => {
  await assert.rejects(() => adminAdjust(admin, { sku: 'SKU-1', type: 'stock_out', quantity: 5, reason: 'oops' }), (e) => e.status === 409)
  assert.equal(inv().quantity, 3)
  await adminAdjust(admin, { sku: 'SKU-1', type: 'stock_in', quantity: 10, reason: 'Supplier delivery', reorderLevel: 4 })
  assert.equal(inv().quantity, 13)
  assert.equal(inv().reorderLevel, 4)
  await adminAdjust(admin, { sku: 'SKU-1', type: 'adjustment', direction: 'remove', quantity: 1, reason: 'Damaged' })
  assert.equal(inv().quantity, 12)
  assert.equal(db.Product[0].stock, 12)
  assert.deepEqual(db.StockMovement.map((m) => [m.type, m.quantity, m.balanceAfter, m.adminName]), [['stock_in', 10, 13, 'Nadia'], ['adjustment', -1, 12, 'Nadia']])
  await assert.rejects(() => adminAdjust(admin, { sku: 'NOPE', type: 'stock_in', quantity: 1, reason: 'x' }), (e) => e.status === 404)
})

test('low-stock alert fires when stock crosses the level, not on every sale below it', async () => {
  db.Inventory[0].quantity = 10; db.Product[0].stock = 10; db.Inventory[0].reorderLevel = 5
  await placeOrder(user, body({ items: [{ product: 'p1', quantity: 2 }] }))   // 10 -> 8: still above
  assert.equal(db.Notification.filter((n) => n.type === 'stock').length, 0)
  await placeOrder(user, body({ items: [{ product: 'p1', quantity: 4 }] }))   // 8 -> 4: crosses
  assert.equal(db.Notification.filter((n) => n.type === 'stock').length, 1)
  await placeOrder(user, body({ items: [{ product: 'p1', quantity: 1 }] }))   // 4 -> 3: already low
  assert.equal(db.Notification.filter((n) => n.type === 'stock').length, 1)
})

test('reviews: only delivered purchases, once per purchase', async () => {
  const review = { product: 'p1', order: 'o9', rating: 5, comment: 'Great' }
  const models = (await import('../models/index.js')).Review
  models.exists = async (f) => db.Review.some((r) => r.user === f.user && r.product === f.product && r.order === f.order)
  models.create = async (d) => { db.Review.push(d); return d }
  await assert.rejects(() => createReview(user, review), (e) => e.status === 403)                // no such order
  db.Order.push({ _id: 'o9', user: 'u1', status: 'Shipped', items: [{ product: 'p1' }] })
  await assert.rejects(() => createReview(user, review), (e) => e.status === 403)                // not delivered yet
  db.Order[0].status = 'Delivered'
  const r = await createReview(user, review)
  assert.equal(r.status, 'pending')                                                              // needs moderation
  await assert.rejects(() => createReview(user, review), (e) => e.status === 409)                // duplicate
  await assert.rejects(() => createReview({ ...user, _id: 'u2' }, review), (e) => e.status === 403) // someone else's order
})

test('adding a variant: refused while the simple product still has stock, then converts cleanly', async () => {
  await assert.rejects(() => addVariantToProduct(admin, 'p1', { sku: 'sku-1-b', model: '512GB', stock: 4, costPrice: 0 }), (e) => e.status === 409 && /3 units/.test(e.message))
  assert.equal(db.ProductVariant.length, 0)
  inv().quantity = 0; db.Product[0].stock = 0
  const { variant } = await addVariantToProduct(admin, 'p1', { sku: 'sku-1-b', model: '512GB', price: 1500, stock: 4, costPrice: 900 })
  assert.equal(variant.sku, 'SKU-1-B')
  assert.deepEqual(db.Inventory.map((i) => [i.sku, i.quantity]), [['SKU-1-B', 4]])               // parent SKU record removed
  assert.equal(db.Product[0].hasVariants, true)
  assert.equal(db.Product[0].stock, 4)
  await assert.rejects(() => resolveLines([{ product: 'p1', quantity: 1 }]), (e) => e.status === 422) // must now pick an option
  const [line] = await resolveLines([{ product: 'p1', variant: variant._id, quantity: 1 }])
  assert.equal(line.unitPrice, 1500)
  assert.equal(db.StockMovement.at(-1).reason, 'Variant added')
})
