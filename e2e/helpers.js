import { test as base, expect } from '@playwright/test'

// Credentials: the sandbox seeds these; against a real stack set the E2E_* variables (see e2e/README.md).
const env = process.env
const creds = {
  customer: { email: env.E2E_CUSTOMER_EMAIL || 'ana@example.test', password: env.E2E_CUSTOMER_PASSWORD || 'Passw0rd1' },
  superAdmin: { email: env.E2E_SUPER_EMAIL || 'super@volta.test', password: env.E2E_SUPER_PASSWORD || 'SuperPass123' },
  admin: { email: env.E2E_ADMIN_EMAIL || 'nadia@volta.test', password: env.E2E_ADMIN_PASSWORD || 'NadiaPass123' },
  limitedAdmin: { email: env.E2E_LIMITED_ADMIN_EMAIL || 'imran@volta.test', password: env.E2E_LIMITED_ADMIN_PASSWORD || 'ImranPass123' },
}
const SANDBOX = env.SANDBOX === '1'

// Every test fails on uncaught page errors and on console errors that are not the browser's own log line for an expected 4xx response.
const test = base.extend({
  page: async ({ page }, use) => {
    const problems = []
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of (4\d\d|503)/.test(m.text())) problems.push(`console: ${m.text()}`) })
    await use(page)
    expect(problems, 'browser console / page errors').toEqual([])
  },
})

async function resetSandbox(request) { if (SANDBOX) await request.get('/__test/reset') }
async function lastEmail(request, to, subjectPart) {
  for (let i = 0; i < 20; i++) {
    const list = await (await request.get('/__test/emails')).json()
    const hit = [...list].reverse().find((e) => e.to === to && (!subjectPart || e.subject.includes(subjectPart)))
    if (hit) return hit
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error(`no email to ${to}`)
}

async function customerLogin(page, { email, password } = creds.customer) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/account/)
}
async function adminLogin(page, { email, password }) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
// Places a COD order through the API as the seeded customer (setup helper for admin tests). Returns the order number.
async function placeOrderViaApi(playwright, { qty = 1, q = 'GaN', email = creds.customer.email, password = creds.customer.password } = {}) {
  const base = process.env.E2E_BASE_URL || 'http://localhost:4173'
  const api = await playwright.request.newContext({ baseURL: base, extraHTTPHeaders: { Origin: base } })
  const login = await api.post('/api/auth/login', { data: { email, password } })
  if (!login.ok()) throw new Error(`customer login failed: ${login.status()}`)
  const found = await (await api.get(`/api/catalog/products?q=${encodeURIComponent(q)}`)).json()
  const res = await api.post('/api/orders', { data: { items: [{ product: found.items[0]._id, quantity: qty }], deliveryMethod: 'standard', currency: 'BDT', acceptCod: true, shippingAddress: { fullName: 'Ana Rahman', phone: '01711111111', country: 'BD', city: 'Dhaka', line1: 'House 12, Road 5, Dhanmondi' } } })
  if (!res.ok()) throw new Error(`order failed: ${res.status()} ${await res.text()}`)
  const order = await res.json()
  await api.dispose()
  return order.number
}
const money = (text) => Number(String(text).replace(/[^\d.]/g, ''))

export { test, expect, creds, SANDBOX, resetSandbox, lastEmail, customerLogin, adminLogin, placeOrderViaApi, money }
