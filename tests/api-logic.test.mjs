import test from 'node:test'
import assert from 'node:assert/strict'
import { ZodError } from 'zod'
import { productSchema, productUpdateSchema, productQuerySchema } from '../validators/catalog.js'
import { placeOrderSchema, quoteSchema, reviewSchema } from '../validators/order.js'
import { adminCreateSchema, adminUpdateSchema, couponSchema, couponUpdateSchema, currencySchema, stockAdjustSchema, orderStatusSchema, zoneSchema } from '../validators/admin.js'
import { registerSchema } from '../validators/auth.js'
import { sanitizeInput, originGuard } from '../middleware/security.js'
import { requirePermission, superOnly } from '../middleware/rbac.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { AppError } from '../utils/AppError.js'

const oid = (n = 1) => String(n).padStart(24, 'a')
const run = (mw, req) => new Promise((resolve) => mw(req, {}, (err) => resolve(err)))
const fakeRes = () => { const r = { code: 200, body: null, status(c) { r.code = c; return r }, json(b) { r.body = b; return r } }; return r }

test('registration enforces a real password and email', () => {
  assert.equal(registerSchema.safeParse({ name: 'Ana Rahman', email: 'ANA@Mail.com', password: 'abc12345' }).data.email, 'ana@mail.com')
  assert.equal(registerSchema.safeParse({ name: 'Ana', email: 'bad', password: 'abc12345' }).success, false)
  assert.equal(registerSchema.safeParse({ name: 'Ana', email: 'a@b.co', password: 'short1' }).success, false)
  assert.equal(registerSchema.safeParse({ name: 'Ana', email: 'a@b.co', password: 'onlyletters' }).success, false)
})

test('checkout schemas: COD must be accepted, quantities bounded, no prices accepted from the browser', () => {
  const body = { items: [{ product: oid(1), quantity: 2 }], shippingAddress: { fullName: 'Ana Rahman', phone: '01711111111', country: 'bd', city: 'Dhaka', line1: 'House 1, Road 2' } }
  const ok = placeOrderSchema.safeParse({ ...body, acceptCod: true })
  assert.equal(ok.success, true)
  assert.equal(ok.data.shippingAddress.country, 'BD')
  assert.equal(placeOrderSchema.safeParse(body).success, false)
  assert.equal(placeOrderSchema.safeParse({ ...body, acceptCod: false }).success, false)
  assert.equal(quoteSchema.safeParse({ ...body, items: [{ product: oid(1), quantity: 11 }] }).success, false)
  assert.equal(quoteSchema.safeParse({ ...body, items: [] }).success, false)
  const sneaky = placeOrderSchema.parse({ ...body, acceptCod: true, items: [{ product: oid(1), quantity: 1, price: 1, unitPrice: 1 }], total: 1, discount: 9999 })
  assert.equal('price' in sneaky.items[0], false)
  assert.equal('total' in sneaky, false)
  assert.equal('discount' in sneaky, false)
  assert.equal(reviewSchema.safeParse({ product: oid(1), order: oid(2), rating: 6 }).success, false)
})

test('admin schemas: permissions are limited to the assignable list', () => {
  const base = { name: 'Nadia R', email: 'n@v.example', password: 'abcdefg1' }
  assert.equal(adminCreateSchema.safeParse({ ...base, permissions: ['orders', 'inventory'] }).success, true)
  assert.equal(adminCreateSchema.safeParse({ ...base, permissions: ['settings'] }).success, false)
  assert.equal(adminCreateSchema.safeParse({ ...base, permissions: ['admins'] }).success, false)
  assert.equal(adminCreateSchema.parse({ ...base, role: 'super_admin' }).role, undefined) // role cannot be chosen by the caller
  assert.equal(adminUpdateSchema.safeParse({ status: 'suspended' }).success, true)
  assert.equal('role' in adminUpdateSchema.parse({ role: 'super_admin', status: 'active' }), false)
})

test('inventory, coupon, currency, zone and status validation', () => {
  assert.equal(stockAdjustSchema.safeParse({ sku: 'VLT-1', type: 'adjustment', quantity: 2, reason: 'recount' }).success, false) // needs direction
  assert.equal(stockAdjustSchema.safeParse({ sku: 'VLT-1', type: 'adjustment', direction: 'remove', quantity: 2, reason: 'damaged' }).success, true)
  assert.equal(stockAdjustSchema.safeParse({ sku: 'VLT-1', type: 'stock_out', quantity: -3, reason: 'bad' }).success, false)
  assert.equal(stockAdjustSchema.safeParse({ sku: 'VLT-1', type: 'stock_in', quantity: 0, reason: 'bad' }).success, false)
  assert.equal(couponSchema.safeParse({ code: 'ok-10', type: 'percent', value: 120 }).success, false)
  assert.equal(couponSchema.safeParse({ code: 'ok-10', type: 'percent', value: 10 }).success, true)
  assert.deepEqual(couponUpdateSchema.parse({ active: false }), { active: false }) // partial update adds no defaults
  assert.equal(currencySchema.safeParse({ code: 'usd', name: 'US Dollar', symbol: '$', rate: 0 }).success, false)
  assert.equal(currencySchema.safeParse({ code: 'usd', name: 'US Dollar', symbol: '$', rate: 0.0082 }).data.code, 'USD')
  assert.equal(zoneSchema.safeParse({ name: 'World', countries: ['*'], baseFee: 100 }).success, true)
  assert.equal(zoneSchema.safeParse({ name: 'X', countries: [], baseFee: 100 }).success, false)
  assert.equal(orderStatusSchema.safeParse({ status: 'Teleported' }).success, false)
})

test('product schemas', () => {
  const p = { name: 'Phone X', sku: 'PX-1', category: oid(1), price: 1000 }
  const parsed = productSchema.parse(p)
  assert.equal(parsed.status, 'draft')
  assert.deepEqual(parsed.variants, [])
  assert.equal(productSchema.safeParse({ ...p, price: -1 }).success, false)
  assert.equal(productUpdateSchema.safeParse({ stock: 999 }).success, true)
  assert.equal('stock' in productUpdateSchema.parse({ stock: 999, price: 5 }), false) // stock only changes through inventory
  assert.equal(productQuerySchema.parse({ sort: 'price-asc', page: '2' }).page, 2)
  assert.equal(productQuerySchema.safeParse({ sort: 'hax' }).success, false)
})

test('sanitizer strips Mongo operators, dotted keys and HTML', async () => {
  const req = { body: { email: { $ne: null }, name: '<script>alert(1)</script>Ana', 'a.b': 1, nested: [{ $where: 'x', ok: '<b>hi</b>' }] }, query: { q: '<img src=x>shoes', $gt: '1' } }
  await run(sanitizeInput, req)
  assert.deepEqual(req.body, { email: {}, name: 'alert(1)Ana', nested: [{ ok: 'hi' }] })
  assert.deepEqual({ ...req.query }, { q: 'shoes' })
})

test('origin guard blocks cross-site writes but allows reads and same-site writes', async () => {
  process.env.CLIENT_URL = 'https://shop.example'
  const { env } = await import('../config/env.js')
  env.clientUrl = 'https://shop.example'
  const get = (o) => ({ method: 'GET', get: () => o })
  const post = (o) => ({ method: 'POST', get: () => o })
  assert.equal(await run(originGuard, get('https://evil.example')), undefined)
  assert.equal(await run(originGuard, post(undefined)), undefined)
  assert.equal(await run(originGuard, post('https://shop.example/')), undefined)
  assert.equal((await run(originGuard, post('https://evil.example'))).status, 403)
})

test('RBAC: admin permissions are enforced by middleware, super admin is unrestricted', async () => {
  const sup = { role: 'super_admin', permissions: [] }
  const nadia = { role: 'admin', permissions: ['orders', 'products'] }
  const none = { role: 'admin', permissions: [] }
  assert.equal(await run(requirePermission('orders'), { admin: nadia }), undefined)
  assert.equal(await run(requirePermission('orders'), { admin: sup }), undefined)
  assert.equal((await run(requirePermission('inventory'), { admin: nadia })).status, 403)
  assert.equal((await run(requirePermission('orders'), { admin: none })).status, 403)
  assert.equal(await run(requirePermission('inventory', 'products'), { admin: nadia }), undefined) // any-of
  assert.equal(await run(superOnly, { admin: sup }), undefined)
  assert.equal((await run(superOnly, { admin: nadia })).status, 403)
})

test('error handler hides internals and maps known errors', () => {
  const origError = console.error; console.error = () => {}
  const call = (err) => { const r = fakeRes(); errorHandler(err, { method: 'GET', originalUrl: '/x' }, r, () => {}); return r }
  assert.equal(call(new AppError(404, 'Nope')).code, 404)
  const boom = call(new Error('secret db password leaked'))
  assert.equal(boom.code, 500)
  assert.equal(boom.body.message.includes('secret'), process.env.NODE_ENV !== 'production')
  assert.equal(call({ code: 11000, keyPattern: { email: 1 } }).code, 409)
  assert.equal(call({ name: 'CastError' }).code, 400)
  assert.equal(call({ name: 'TokenExpiredError' }).code, 401)
  const z = call(new ZodError([{ code: 'custom', path: ['email'], message: 'Bad email' }]))
  assert.equal(z.code, 400)
  assert.equal(z.body.fields.email, 'Bad email')
  console.error = origError
})
