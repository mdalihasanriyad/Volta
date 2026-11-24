import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { install, seedBasic } from './helpers/fakeDb.mjs'
import * as ops from '../controllers/adminOpsController.js'
import * as catalog from '../controllers/adminCatalogController.js'
import { refreshSession } from '../services/authService.js'
import { Admin } from '../models/index.js'
import { ADMIN_COOKIES, signRefresh } from '../utils/tokens.js'

console.log = () => {}
let db
beforeEach(() => { db = install(); seedBasic(db) })

const handle = (fn, req) => new Promise((resolve, reject) => {
  const res = { statusCode: 200, status(c) { res.statusCode = c; return res }, json(b) { resolve({ status: res.statusCode, body: b }); return res } }
  fn({ params: {}, query: {}, body: {}, ...req }, res, (e) => (e ? reject(e) : resolve({ status: res.statusCode })))
})
const regular = { _id: 'a1', name: 'Nadia', role: 'admin', permissions: ['inventory', 'products'] }
const boss = { _id: 'a0', name: 'Boss', role: 'super_admin', permissions: [] }

test('regular admins never receive cost prices from product detail', async () => {
  const forAdmin = await handle(catalog.getProduct, { admin: regular, params: { id: 'p1' } })
  assert.equal('costPrice' in forAdmin.body.inventory[0], false)
  const forSuper = await handle(catalog.getProduct, { admin: boss, params: { id: 'p1' } })
  assert.equal(forSuper.body.inventory[0].costPrice, 700)
})

test('regular admins cannot set cost prices through stock adjustments or new products', async () => {
  const r = await handle(ops.inventoryAdjust, { admin: regular, body: { sku: 'SKU-1', type: 'stock_in', quantity: 2, reason: 'delivery', costPrice: 1 } })
  assert.equal(r.body.costPrice, undefined)
  assert.equal(db.Inventory[0].costPrice, 700)               // unchanged
  assert.equal(db.Inventory[0].quantity, 5)
  await handle(ops.inventoryAdjust, { admin: boss, body: { sku: 'SKU-1', type: 'stock_in', quantity: 1, reason: 'delivery', costPrice: 650 } })
  assert.equal(db.Inventory[0].costPrice, 650)               // a Super Admin can

  const base = { name: 'Case', sku: 'CASE-1', category: 'c1', price: 300, status: 'draft', images: [], colors: [], specs: {}, isFeatured: false, stock: 5, costPrice: 99, variants: [] }
  await handle(catalog.addProduct, { admin: regular, body: base })
  assert.equal(db.Inventory.find((i) => i.sku === 'CASE-1').costPrice, 0)
  await handle(catalog.addProduct, { admin: boss, body: { ...base, name: 'Case 2', sku: 'CASE-2' } })
  assert.equal(db.Inventory.find((i) => i.sku === 'CASE-2').costPrice, 99)
})

test('admin idle timeout: a stale session cannot refresh, an active one can', async () => {
  const mk = (lastActiveAt) => ({ _id: 'a9', status: 'active', tokenVersion: 0, lastActiveAt, save: async function () {} })
  const req = (a) => ({ cookies: { [ADMIN_COOKIES.refresh]: signRefresh(a._id, 0, 'admin') } })
  const res = { cookie() {}, clearCookie() {} }

  let a = mk(new Date(Date.now() - 3 * 3600000))             // idle for 3 hours, limit 60 minutes
  Admin.findById = async () => a
  await assert.rejects(() => refreshSession(req(a), res, 'admin', { idleMinutes: 60 }), (e) => e.status === 401 && /timed out/.test(e.message))

  a = mk(new Date(Date.now() - 10 * 60000))                  // active 10 minutes ago
  const doc = await refreshSession(req(a), res, 'admin', { idleMinutes: 60 })
  assert.ok(Date.now() - doc.lastActiveAt.getTime() < 2000)  // activity time moved forward

  a = mk(new Date(Date.now() - 3 * 3600000))
  await refreshSession(req(a), res, 'admin', {})            // no limit configured -> allowed
  a = { ...mk(new Date()), status: 'suspended' }
  await assert.rejects(() => refreshSession(req(a), res, 'admin', { idleMinutes: 60 }), (e) => e.status === 401)
  a = { ...mk(new Date()), tokenVersion: 4 }
  await assert.rejects(() => refreshSession(req(a), res, 'admin', { idleMinutes: 60 }), (e) => e.status === 401)
})
