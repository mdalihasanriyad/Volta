// Permission audit of the REAL route tables (api/routes/*.js) and middleware chains.
// The expected access rules below are written by hand, independently of the code, and every route must be listed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { dispatch } from './stubs/express.mjs'
import { Admin, User } from '../models/index.js'
import adminRouter from '../api/routes/admin.js'
import customerRouter from '../api/routes/customer.js'
import storeRouter from '../api/routes/store.js'
import authRouter from '../api/routes/auth.js'
import { ADMIN_COOKIES, CUSTOMER_COOKIES, signAccess } from '../utils/tokens.js'
import { ASSIGNABLE_PERMISSIONS } from '../models/Admin.js'

const ID = '507f1f77bcf86cd799439011'
// errorHandler (tested separately) turns JWT errors into 401, so the same mapping is used here
const statusOf = (e) => (e ? e.status ?? (['JsonWebTokenError', 'TokenExpiredError'].includes(e.name) ? 401 : undefined) : undefined)

// ---------- fake accounts ----------
const admins = new Map()
const users = new Map()
const mkAdmin = (key, o) => { const a = { _id: `adm-${key}`, name: key, role: 'admin', status: 'active', permissions: [], tokenVersion: 0, ...o }; admins.set(a._id, a); return a }
Admin.findById = async (id) => admins.get(String(id)) || null
User.findById = async (id) => users.get(String(id)) || null

const superA = mkAdmin('super', { role: 'super_admin' })
const actors = {
  none: { cookies: {} },
  superAdmin: { admin: superA },
  everyPermission: { admin: mkAdmin('all', { permissions: [...ASSIGNABLE_PERMISSIONS] }) },
  noPermission: { admin: mkAdmin('nothing') },
  suspended: { admin: mkAdmin('susp', { status: 'suspended', permissions: [...ASSIGNABLE_PERMISSIONS] }) },
  staleToken: { admin: mkAdmin('stale', { permissions: [...ASSIGNABLE_PERMISSIONS], tokenVersion: 3 }), tokenVersion: 0 }, // token issued before a revoke
  deleted: { token: signAccess('adm-ghost', 0, 'admin') },
  customerToken: { token: signAccess('cust-1', 0, 'customer') },
}
for (const p of ASSIGNABLE_PERMISSIONS) actors[`only:${p}`] = { admin: mkAdmin(`only-${p}`, { permissions: [p] }) }

const cookiesFor = (a) => {
  const token = a.token || (a.admin ? signAccess(a.admin._id, a.tokenVersion ?? a.admin.tokenVersion, 'admin') : null)
  return token ? { [ADMIN_COOKIES.access]: token } : {}
}

import { ADMIN_RULES } from './helpers/adminRules.mjs'

const routesOf = (router) => router.stack.filter((l) => l.type === 'route').map((l) => ({ method: l.method, path: l.path, key: `${l.method} ${l.path}` }))
const urlOf = (path) => path.replace(/:[A-Za-z]+/g, ID)

function expectedAllowed(actorName, actor, rule) {
  if (rule === 'public') return true
  if (!actor.admin || actorName === 'staleToken' || actorName === 'suspended') return false
  if (actor.admin.role === 'super_admin') return true
  if (rule === 'admin') return true
  if (rule === 'super') return false
  return [].concat(rule).some((p) => actor.admin.permissions.includes(p))
}

async function outcome(router, method, path, actor) {
  const out = await dispatch(router, method, urlOf(path), { cookies: cookiesFor(actor), body: {}, query: {} })
  const e = out.error
  const st = statusOf(e)
  if ([401, 403].includes(st)) return { allowed: false, status: st }
  // anything else means authentication and permission checks passed (a later 400 for the empty body is fine)
  return { allowed: true, error: e && e.name }
}

test('every admin route is covered by the hand-written permission table (and vice versa)', () => {
  const actual = new Set(routesOf(adminRouter).map((r) => r.key))
  const expected = new Set(Object.keys(ADMIN_RULES))
  assert.deepEqual([...actual].filter((k) => !expected.has(k)), [], 'routes missing from the permission table')
  assert.deepEqual([...expected].filter((k) => !actual.has(k)), [], 'table entries without a route')
})

test('admin routes: full actor x route authorization matrix', async () => {
  const failures = []
  let checks = 0
  for (const r of routesOf(adminRouter)) {
    for (const [name, actor] of Object.entries(actors)) {
      const want = expectedAllowed(name, actor, ADMIN_RULES[r.key])
      const got = await outcome(adminRouter, r.method, r.path, actor)
      checks++
      if (got.allowed !== want) failures.push(`${name} -> ${r.key}: expected ${want ? 'allowed' : 'denied'}, got ${got.allowed ? 'allowed' : 'denied ' + got.status}`)
      if (!want && ADMIN_RULES[r.key] !== 'public') {
        const wantStatus = actor.admin && name !== 'staleToken' && name !== 'suspended' ? 403 : 401
        if (got.status !== wantStatus) failures.push(`${name} -> ${r.key}: expected status ${wantStatus}, got ${got.status}`)
      }
    }
  }
  assert.deepEqual(failures, [])
  assert.ok(checks >= 900, `matrix too small (${checks})`)
})

test('permission checks run BEFORE body validation (a denied admin never learns about field errors)', async () => {
  for (const r of routesOf(adminRouter).filter((x) => ADMIN_RULES[x.key] === 'super' && x.method !== 'GET')) {
    const got = await outcome(adminRouter, r.method, r.path, actors.everyPermission)
    assert.equal(got.allowed, false, r.key)
    assert.equal(got.status, 403, r.key)
  }
})

test('an admin cannot change their own account, and an admin id in the URL is not a way around permissions', async () => {
  const self = await dispatch(adminRouter, 'PATCH', `/admins/${superA._id}`, { cookies: cookiesFor(actors.superAdmin), body: { status: 'suspended' } })
  assert.equal(statusOf(self.error), 403)
  const other = await dispatch(adminRouter, 'PATCH', `/admins/${ID}`, { cookies: cookiesFor(actors.superAdmin), body: { status: 'suspended' } })
  assert.notEqual(statusOf(other.error), 403) // reaches validation / the controller
  const sneaky = await dispatch(adminRouter, 'PATCH', `/admins/${actors.everyPermission.admin._id}`, { cookies: cookiesFor(actors.everyPermission), body: { permissions: ['orders'] } })
  assert.equal(statusOf(sneaky.error), 403)
})

test('suspended, revoked or deleted admins lose access immediately', async () => {
  const a = mkAdmin('live', { permissions: ['orders'] })
  const issued = cookiesFor({ admin: a }) // the session cookie the admin got when signing in; it never changes below
  const cookies = () => issued
  assert.equal((await dispatch(adminRouter, 'GET', '/orders', { cookies: cookies() })).error, null)
  a.permissions = [] // a Super Admin revoked the permission
  assert.equal(statusOf((await dispatch(adminRouter, 'GET', '/orders', { cookies: cookies() })).error), 403)
  a.permissions = ['orders']; a.status = 'suspended'
  assert.equal(statusOf((await dispatch(adminRouter, 'GET', '/orders', { cookies: cookies() })).error), 401)
  a.status = 'active'; a.tokenVersion += 1 // sessions revoked
  assert.equal(statusOf((await dispatch(adminRouter, 'GET', '/orders', { cookies: cookies() })).error), 401)
  admins.delete(a._id)
  assert.equal(statusOf((await dispatch(adminRouter, 'GET', '/orders', { cookies: cookies() })).error), 401)
})

test('customer and admin sessions are not interchangeable', async () => {
  const cust = { _id: 'cust-1', status: 'active', emailVerified: true, tokenVersion: 0 }
  users.set('cust-1', cust)
  const customerCookie = signAccess('cust-1', 0, 'customer')
  // customer token presented as an admin cookie
  assert.equal(statusOf((await dispatch(adminRouter, 'GET', '/dashboard', { cookies: { [ADMIN_COOKIES.access]: customerCookie } })).error), 401)
  // admin token presented as a customer cookie
  const adminToken = signAccess(superA._id, 0, 'admin')
  assert.equal(statusOf((await dispatch(customerRouter, 'GET', '/orders', { cookies: { [CUSTOMER_COOKIES.access]: adminToken } })).error), 401)
  // a refresh-secret token is not an access token
  assert.equal(statusOf((await dispatch(adminRouter, 'GET', '/dashboard', { cookies: { [ADMIN_COOKIES.access]: 'not-a-token' } })).error), 401)
})

// ---------- customer-facing routes ----------
const CUSTOMER_RULES = { 'GET /orders/track/:number': 'public' } // everything else needs a signed-in customer

test('customer routes: only tracking is public; no guest checkout', async () => {
  const cust = { _id: 'cust-2', status: 'active', emailVerified: true, tokenVersion: 0 }
  users.set('cust-2', cust)
  const ok = { [CUSTOMER_COOKIES.access]: signAccess('cust-2', 0, 'customer') }
  const blocked = { _id: 'cust-3', status: 'blocked', emailVerified: true, tokenVersion: 0 }; users.set('cust-3', blocked)
  const stale = { _id: 'cust-4', status: 'active', emailVerified: true, tokenVersion: 5 }; users.set('cust-4', stale)
  for (const r of routesOf(customerRouter)) {
    const pub = CUSTOMER_RULES[r.key] === 'public'
    const anon = await dispatch(customerRouter, r.method, urlOf(r.path), { cookies: {}, body: {} })
    assert.equal(statusOf(anon.error) === 401, !pub, `anonymous ${r.key}`)
    if (pub) continue
    assert.notEqual(statusOf((await dispatch(customerRouter, r.method, urlOf(r.path), { cookies: ok, body: {}, query: {} })).error), 401, `signed-in ${r.key}`)
    for (const [label, id, tv] of [['blocked', 'cust-3', 0], ['revoked', 'cust-4', 0]]) {
      const c = { [CUSTOMER_COOKIES.access]: signAccess(id, tv, 'customer') }
      assert.equal(statusOf((await dispatch(customerRouter, r.method, urlOf(r.path), { cookies: c, body: {} })).error), 401, `${label} ${r.key}`)
    }
  }
})

test('placing an order needs a verified email; quoting does not', async () => {
  users.set('cust-5', { _id: 'cust-5', status: 'active', emailVerified: false, tokenVersion: 0 })
  const c = { [CUSTOMER_COOKIES.access]: signAccess('cust-5', 0, 'customer') }
  assert.equal(statusOf((await dispatch(customerRouter, 'POST', '/orders', { cookies: c, body: {} })).error), 403)
  assert.notEqual(statusOf((await dispatch(customerRouter, 'POST', '/checkout/quote', { cookies: c, body: {} })).error), 403)
})

test('storefront routes are public and account routes in the auth router are protected', async () => {
  for (const r of routesOf(storeRouter)) {
    const out = await dispatch(storeRouter, r.method, urlOf(r.path), { cookies: {}, body: {}, query: {} })
    assert.notEqual(statusOf(out.error), 401, r.key)
  }
  const protectedAuth = new Set(['POST /resend-verification', 'PATCH /password', 'PATCH /profile']) // GET /me answers { user: null } for visitors
  for (const r of routesOf(authRouter)) {
    const out = await dispatch(authRouter, r.method, urlOf(r.path), { cookies: {}, body: {} })
    assert.equal(statusOf(out.error) === 401, protectedAuth.has(r.key), r.key)
  }
})
