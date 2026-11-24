import { test, expect, creds, resetSandbox, placeOrderViaApi } from './helpers.js'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:4173'
const H = { Origin: BASE }
test.beforeAll(async ({ request }) => { await resetSandbox(request) })

test('NoSQL operators and HTML in input never get through', async ({ request }) => {
  const evil = await request.post('/api/auth/login', { data: { email: { $ne: null }, password: { $ne: null } }, headers: H })
  expect([400, 401]).toContain(evil.status())
  const q = await request.get('/api/catalog/products?category[$ne]=x&sort[$gt]=1')
  expect([200, 400]).toContain(q.status())
  if (q.status() === 200) expect((await q.json()).total).toBeLessThanOrEqual(28)
  const xss = await request.post('/api/catalog/contact', { data: { name: '<script>alert(1)</script>Eve', email: 'eve@x.test', subject: '<img src=x onerror=alert(1)>Hello', message: 'A normal message with <b>tags</b> inside' }, headers: H })
  expect(xss.status()).toBe(201)
  const bad = await request.post('/api/auth/login', { data: '{not json', headers: { ...H, 'Content-Type': 'application/json' } })
  expect(bad.status()).toBe(400)
})

test('cookies are HttpOnly and the API refuses cross-site writes', async ({ playwright }) => {
  const api = await playwright.request.newContext({ baseURL: BASE })
  const res = await api.post('/api/auth/login', { data: { email: creds.customer.email, password: creds.customer.password }, headers: H })
  expect(res.status()).toBe(200)
  const cookies = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value)
  expect(cookies.length).toBeGreaterThanOrEqual(2)
  for (const c of cookies) { expect(c).toMatch(/HttpOnly/i); expect(c).toMatch(/SameSite=Lax/i) }
  expect(JSON.stringify(await res.json())).not.toMatch(/passwordHash|tokenVersion/)             // no secrets in responses
  const cross = await api.post('/api/orders', { data: {}, headers: { Origin: 'https://evil.example' } })
  expect(cross.status()).toBe(403)
  const anon = await playwright.request.newContext({ baseURL: BASE })
  expect((await anon.get('/api/orders')).status()).toBe(401)
  expect((await anon.get('/api/admin/orders')).status()).toBe(401)
  expect((await anon.post('/api/orders', { data: {}, headers: H })).status()).toBe(401)           // no guest checkout
  await api.dispose(); await anon.dispose()
})

test('a customer cannot see, cancel or review another customer’s order; prices cannot be tampered with', async ({ playwright }) => {
  const number = await placeOrderViaApi(playwright)
  const other = await playwright.request.newContext({ baseURL: BASE, extraHTTPHeaders: H })
  const reg = await other.post('/api/auth/register', { data: { name: 'Mallory Evil', email: 'mallory@x.test', password: 'Passw0rd99' } })
  expect(reg.status()).toBe(201)
  expect((await other.get(`/api/orders/${number}`)).status()).toBe(404)
  expect((await other.post(`/api/orders/${number}/cancel`)).status()).toBe(404)
  expect((await other.post(`/api/orders/${number}/return`, { data: { reason: 'not mine at all' } })).status()).toBe(404)
  expect((await other.get(`/api/orders/track/${number}?email=mallory@x.test`)).status()).toBe(404)
  // unverified accounts cannot place orders, whatever they send
  const product = (await (await other.get('/api/catalog/products?q=GaN')).json()).items[0]
  const tamper = await other.post('/api/orders', { data: { items: [{ product: product._id, quantity: 1, unitPrice: 1, price: 1 }], total: 1, subtotal: 1, discount: 99999, deliveryMethod: 'standard', acceptCod: true, shippingAddress: { fullName: 'Mallory Evil', phone: '01711111111', country: 'BD', city: 'Dhaka', line1: 'Somewhere 12' } } })
  expect(tamper.status()).toBe(403)
  // a verified customer who tampers still pays the real price
  const ana = await playwright.request.newContext({ baseURL: BASE, extraHTTPHeaders: H })
  await ana.post('/api/auth/login', { data: { email: creds.customer.email, password: creds.customer.password } })
  const ok = await ana.post('/api/orders', { data: { items: [{ product: product._id, quantity: 1, unitPrice: 1, price: 1 }], total: 1, subtotal: 1, discount: 99999, shippingFee: 0, deliveryMethod: 'standard', acceptCod: true, shippingAddress: { fullName: 'Ana Rahman', phone: '01711111111', country: 'BD', city: 'Dhaka', line1: 'House 12, Road 5' } } })
  expect(ok.status()).toBe(201)
  const order = await (await ana.get(`/api/orders/${(await ok.json()).number}`)).json()
  expect(order.total).toBe(3280)                                                                  // 3,200 + 80 delivery, not 1
  expect(order.items[0].unitPrice).toBe(3200)
  // mass assignment: profile updates cannot change role/verification
  await other.patch('/api/auth/profile', { data: { name: 'Mallory E', emailVerified: true, role: 'admin', status: 'active' } })
  const me = await (await other.get('/api/auth/me')).json()
  expect(me.user.emailVerified).toBe(false)
  expect((await other.get('/api/admin/orders')).status()).toBe(401)
  await other.dispose(); await ana.dispose()
})

test('errors are JSON, never stack traces; unknown routes are 404', async ({ request }) => {
  const r = await request.get('/api/nope/nothing')
  expect([401, 404]).toContain(r.status())
  expect(r.headers()['content-type']).toContain('application/json')
  const p = await request.get('/api/catalog/products/does-not-exist')
  expect(p.status()).toBe(404)
  expect(await p.text()).not.toMatch(/at .*\.js:\d+|node_modules|Error:/)
  const v = await request.post('/api/catalog/newsletter', { data: { email: 'not-an-email' }, headers: H })
  expect(v.status()).toBe(400)
  expect((await v.json()).fields.email).toBeTruthy()
})
