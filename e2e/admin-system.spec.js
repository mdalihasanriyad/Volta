import { test, expect, creds, resetSandbox, adminLogin } from './helpers.js'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:4173'

test.describe.configure({ mode: 'serial' })
test.beforeAll(async ({ request }) => { await resetSandbox(request) })

const toast = (page) => page.getByRole('status')
const NEW_ADMIN = { name: 'E2E Admin', email: 'e2e.admin@volta.test', password: 'E2eAdmin123' }

test('Super Admin creates an admin; permissions, revoke and suspension take effect immediately', async ({ page, browser }) => {
  await adminLogin(page, creds.superAdmin)
  await page.getByRole('link', { name: 'Admin management' }).click()
  await expect(page.getByRole('row', { name: /Nadia Rahman/ })).toContainText('orders, customers, products, inventory')
  await expect(page.getByRole('row', { name: /Super Admin/ })).toContainText('Everything')
  await expect(page.getByRole('row', { name: /Super Admin/ }).getByRole('button')).toHaveCount(0)   // the Super Admin row has no controls

  await page.getByRole('button', { name: 'New admin' }).click()
  const form = page.getByRole('dialog', { name: 'Create admin' })
  await form.getByLabel('Full name').fill(NEW_ADMIN.name)
  await form.getByLabel('Email').fill(NEW_ADMIN.email)
  await form.getByLabel('Initial password').fill('weak')
  await form.getByRole('button', { name: 'Create admin' }).click()
  await expect(form.getByText('Use at least 8 characters')).toBeVisible()
  await form.getByLabel('Initial password').fill('nodigitshere')
  await form.getByRole('button', { name: 'Create admin' }).click()
  await expect(form.getByText('Include a number')).toBeVisible()      // the server enforces the password rule too
  await form.getByLabel('Initial password').fill(NEW_ADMIN.password)
  await form.getByLabel('Products and brands').check()
  await form.getByRole('button', { name: 'Create admin' }).click()
  await expect(toast(page)).toContainText('Admin created')
  await expect(page.getByRole('row', { name: /E2E Admin/ })).toContainText('orders, products')

  // the new admin signs in and sees exactly what was granted
  const other = await browser.newPage()
  await adminLogin(other, { email: NEW_ADMIN.email, password: NEW_ADMIN.password })
  await expect(other.getByRole('navigation', { name: 'Admin' }).getByRole('link')).toHaveText(['Dashboard', 'Orders', 'Products', 'Brands', 'Notifications'])
  await other.getByRole('link', { name: 'Products' }).click()
  await expect(other.getByRole('heading', { name: 'Products' })).toBeVisible()

  // revoke everything: the very next request is refused, a reload shows no access
  await page.getByRole('row', { name: /E2E Admin/ }).getByRole('button', { name: /Revoke all/ }).click()
  await expect(toast(page)).toContainText('All permissions revoked')
  expect((await other.request.get('/api/admin/products')).status()).toBe(403)
  await other.goto('/admin/products')
  await expect(other.getByText(/do not have access to Products/)).toBeVisible()

  // grant orders again, then suspend: sessions end and sign-in is blocked
  await page.getByRole('row', { name: /E2E Admin/ }).getByRole('button', { name: 'Permissions' }).click()
  await page.getByRole('dialog', { name: /Permissions: E2E Admin/ }).getByLabel('Order management').check()
  await page.getByRole('dialog', { name: /Permissions: E2E Admin/ }).getByRole('button', { name: 'Save permissions' }).click()
  expect((await other.request.get('/api/admin/orders')).status()).toBe(200)
  await page.getByRole('row', { name: /E2E Admin/ }).getByRole('button', { name: 'Suspend' }).click()
  await page.getByRole('dialog', { name: 'Suspend admin' }).getByRole('button', { name: 'Suspend' }).click()
  await expect(page.getByRole('row', { name: /E2E Admin/ })).toContainText('Suspended')
  expect((await other.request.get('/api/admin/orders')).status()).toBe(401)
  await other.goto('/admin/login')
  await other.getByLabel('Email').fill(NEW_ADMIN.email)
  await other.getByLabel('Password').fill(NEW_ADMIN.password)
  await other.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(other.getByRole('alert')).toContainText('disabled')
  await page.getByRole('row', { name: /E2E Admin/ }).getByRole('button', { name: 'Reactivate' }).click()
  await page.getByRole('dialog', { name: 'Reactivate admin' }).getByRole('button', { name: 'Reactivate' }).click()
  await other.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(other).toHaveURL(/\/admin$/)
  await other.close()
})

test('a Super Admin cannot be changed through the API and admins cannot touch their own account', async ({ page }) => {
  await adminLogin(page, creds.superAdmin)
  const list = await (await page.request.get('/api/admin/admins')).json()
  const boss = list.find((a) => a.role === 'super_admin')
  const origin = { Origin: BASE }
  const self = await page.request.patch(`/api/admin/admins/${boss._id}`, { data: { status: 'suspended' }, headers: origin })
  expect(self.status()).toBe(403)
  const nadia = list.find((a) => a.email === creds.admin.email)
  const promote = await page.request.patch(`/api/admin/admins/${nadia._id}`, { data: { role: 'super_admin', permissions: ['orders'] }, headers: origin })
  expect(promote.status()).toBe(200)
  expect((await promote.json()).role).toBe('admin')                 // "role" is not an accepted field: nobody can be promoted by API
  const bad = await page.request.patch(`/api/admin/admins/${nadia._id}`, { data: { permissions: ['settings'] }, headers: origin })
  expect(bad.status()).toBe(400)                                    // only the grantable permissions exist
  const noOrigin = await page.request.post('/api/admin/admins', { data: { name: 'X Y', email: 'x@y.test', password: 'Passw0rd99' }, headers: { Origin: 'https://evil.example' } })
  expect(noOrigin.status()).toBe(403)                               // cross-site requests are blocked
})

test('homepage content, SEO and maintenance mode (Super Admin) change the storefront', async ({ page, browser }) => {
  await adminLogin(page, creds.superAdmin)
  // hide a section
  await page.goto('/admin/content')
  const row = page.locator('li').filter({ hasText: 'Special offers' })
  await row.getByLabel('Visible').uncheck()
  await page.getByLabel('Message (leave empty to hide)').fill('E2E announcement: free cables this week')
  await page.getByRole('button', { name: 'Save layout' }).click()
  await expect(toast(page)).toContainText('Homepage layout saved')
  const shop = await browser.newPage()
  await shop.goto('/')
  await expect(shop.getByRole('heading', { name: 'Special offers' })).toHaveCount(0)
  await expect(shop.getByRole('heading', { name: 'Best sellers' })).toBeVisible()
  await expect(shop.getByText('E2E announcement: free cables this week')).toBeVisible()
  // restore
  await page.locator('li').filter({ hasText: 'Special offers' }).getByLabel('Visible').check()
  await page.getByRole('button', { name: 'Save layout' }).click()
  await expect(toast(page)).toContainText('saved')

  // SEO: homepage title and canonical
  await page.goto('/admin/seo')
  await page.getByLabel('Meta title', { exact: false }).first().fill('E2E Title – best gadgets')
  await page.getByRole('button', { name: 'Save SEO' }).click()
  await expect(toast(page)).toContainText('SEO saved')
  await shop.goto('/')
  await expect(shop).toHaveTitle('E2E Title – best gadgets')
  expect(await shop.locator('link[rel=canonical]').getAttribute('href')).toBe(`${BASE}/`)
  await shop.goto('/product/65w-gan-fast-charger')
  await expect(shop.getByRole('heading', { level: 1 })).toContainText('GaN')
  const ld = JSON.parse(await shop.locator('script[type="application/ld+json"]').textContent())
  expect(ld['@type']).toBe('Product')
  expect(ld.offers.price).toBe(3200)
  const sitemap = await (await shop.request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('/product/65w-gan-fast-charger')
  expect(await (await shop.request.get('/robots.txt')).text()).toContain('Disallow: /admin')

  // maintenance mode hides the storefront (the admin still works)
  await page.goto('/admin/settings')
  await page.getByLabel(/Maintenance mode/).check()
  await page.getByRole('button', { name: 'Save store settings' }).click()
  await expect(toast(page)).toContainText('Store settings saved')
  await shop.goto('/shop')
  await expect(shop.getByText('We will be back soon')).toBeVisible()
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await page.goto('/admin/settings')
  await page.getByLabel(/Maintenance mode/).uncheck()
  await page.getByRole('button', { name: 'Save store settings' }).click()
  await expect(toast(page)).toContainText('Store settings saved')
  await shop.reload()
  await expect(shop.getByText('We will be back soon')).toHaveCount(0)
  await shop.close()
})

test('activity log records admin actions with who and when; admins cannot read it', async ({ page, browser }) => {
  await adminLogin(page, creds.superAdmin)
  await page.getByRole('link', { name: 'Activity logs' }).click()
  await expect(page.getByRole('heading', { name: 'Activity logs' })).toBeVisible()
  await expect(page.getByRole('row', { name: /Signed in/ }).first()).toContainText('Super Admin')
  await expect(page.getByRole('row', { name: /PUT \S*\/admin\/settings/ }).first()).toBeVisible()
  await expect(page.getByRole('row', { name: /POST \S*\/admin\/admins/ }).first()).toBeVisible()
  // no password ever appears in the log
  expect(await page.locator('main').textContent()).not.toMatch(/E2eAdmin123|SuperPass123/)
  const lim = await browser.newPage()
  await adminLogin(lim, creds.limitedAdmin)
  expect((await lim.request.get('/api/admin/logs')).status()).toBe(403)
  await lim.close()
})
