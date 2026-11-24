import { test, expect, creds, resetSandbox, customerLogin, adminLogin, placeOrderViaApi } from './helpers.js'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:4173'

test.describe.configure({ mode: 'serial' })
test.beforeAll(async ({ request }) => { await resetSandbox(request) })

const sidebar = (page) => page.getByRole('navigation', { name: 'Admin' })
const links = async (page) => {
  await expect(sidebar(page).getByRole('link').first()).toBeVisible()
  return (await sidebar(page).getByRole('link').allTextContents()).map((t) => t.trim())
}
let orderNumber

test('admin sign in: wrong password fails, there is no public admin sign up, dashboard shows revenue to Super Admin', async ({ page }) => {
  await page.goto('/admin/login')
  await expect(page.getByText(/no public sign up/i)).toBeVisible()
  await page.getByLabel('Email').fill(creds.superAdmin.email)
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Incorrect email or password')
  await page.getByLabel('Password').fill(creds.superAdmin.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Total revenue')).toBeVisible()
  await expect(page.getByText('Super Admin', { exact: true }).first()).toBeVisible()
  const all = await links(page)
  for (const l of ['Dashboard', 'Orders', 'Customers', 'Sales reports', 'Coupons', 'Products', 'Categories', 'Brands', 'Inventory', 'Reviews', 'Banners', 'Content', 'SEO', 'Shipping', 'Currency', 'Notifications', 'Admin management', 'Activity logs', 'Settings']) expect(all).toContain(l)
  await page.reload()                                           // session survives a reload
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/admin\/login/)
  await page.goto('/admin/orders')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('role-based menus and blocked routes: limited admin vs. Nadia vs. customer', async ({ page, browser }) => {
  await adminLogin(page, creds.limitedAdmin)                    // only "orders"
  expect(await links(page)).toEqual(['Dashboard', 'Orders', 'Notifications'])
  await expect(page.getByText('Total revenue')).toHaveCount(0)   // financial figures are hidden
  await page.goto('/admin/coupons')
  await expect(page.getByText(/do not have access to Coupons/)).toBeVisible()
  await page.goto('/admin/admins')
  await expect(page.getByText(/do not have access to Admin management/)).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()

  await adminLogin(page, creds.admin)                           // orders, customers, products, inventory
  const nadia = await links(page)
  for (const l of ['Dashboard', 'Orders', 'Customers', 'Products', 'Brands', 'Inventory', 'Notifications']) expect(nadia).toContain(l)
  for (const l of ['Sales reports', 'Coupons', 'Currency', 'Shipping', 'Settings', 'Admin management', 'Activity logs', 'SEO', 'Content', 'Categories', 'Banners', 'Reviews']) expect(nadia).not.toContain(l)
  // the server refuses what the menu hides
  for (const [path, status] of [['/api/admin/sales?period=daily', 403], ['/api/admin/coupons', 403], ['/api/admin/settings', 403], ['/api/admin/logs', 403], ['/api/admin/admins', 403], ['/api/admin/categories', 403], ['/api/admin/products', 200], ['/api/admin/orders', 200]]) {
    expect((await page.request.get(path)).status(), path).toBe(status)
  }
  const create = await page.request.post('/api/admin/admins', { data: { name: 'Sneaky', email: 'sneaky@x.test', password: 'Passw0rd99', permissions: [] }, headers: { Origin: BASE } })
  expect(create.status()).toBe(403)

  // a customer session is not an admin session
  const cust = await browser.newPage()
  await customerLogin(cust)
  expect((await cust.request.get('/api/admin/orders')).status()).toBe(401)
  await cust.goto('/admin')
  await expect(cust).toHaveURL(/\/admin\/login/)
  await cust.close()
})

test('orders: admin moves an order through its lifecycle; invalid steps are refused', async ({ page, playwright }) => {
  orderNumber = await placeOrderViaApi(playwright, { qty: 2 })
  await adminLogin(page, creds.limitedAdmin)
  await page.getByRole('link', { name: 'Orders' }).click()
  await expect(page.getByText(orderNumber)).toBeVisible()
  await page.getByLabel(`View ${orderNumber}`).click()
  const dialog = page.getByRole('dialog', { name: `Order ${orderNumber}` })
  await expect(dialog.getByText('Cash on Delivery')).toBeVisible()
  await expect(dialog.getByLabel('Status', { exact: true })).toHaveValue('Pending')
  await dialog.getByLabel('Status', { exact: true }).selectOption('Confirmed')
  await expect(page.getByRole('status')).toContainText('Status changed to Confirmed')
  // skipping to a status that is not allowed from here is refused by the server
  await dialog.getByLabel('Status', { exact: true }).selectOption('Returned')
  await expect(page.getByRole('status')).toContainText('Cannot change an order from Confirmed to Returned')
  await expect(dialog.getByLabel('Status', { exact: true })).toHaveValue('Confirmed')
  await dialog.getByLabel('Tracking reference').fill('PATHAO-998877')
  await dialog.getByLabel(/Internal note/).fill('Customer asked for evening delivery')
  await dialog.getByLabel(/Internal note/).blur()
  await expect(page.getByRole('status')).toContainText('Note saved')
  await dialog.getByLabel('Status', { exact: true }).selectOption('Shipped')
  await expect(page.getByRole('status')).toContainText('Status changed to Shipped')
  // customers can no longer cancel after shipping; admins neither
  await expect(dialog.getByRole('button', { name: 'Cancel order' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Invoice' }).click()
  await expect(page.getByRole('dialog', { name: `Invoice ${orderNumber}` })).toContainText('Total (BDT)')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  // CSV export (formula-safe, same filters)
  const csv = await page.request.get('/api/admin/orders?format=csv')
  expect(csv.headers()['content-type']).toContain('text/csv')
  expect(await csv.text()).toContain(orderNumber)
})

test('the customer sees status and tracking updates; delivery marks COD as paid; then a verified review works', async ({ page, browser }) => {
  const admin = await browser.newPage()
  await adminLogin(admin, creds.limitedAdmin)
  await admin.goto('/admin/orders')
  await admin.getByLabel(`View ${orderNumber}`).click()
  const dialog = admin.getByRole('dialog', { name: `Order ${orderNumber}` })
  await dialog.getByLabel('Status', { exact: true }).selectOption('Out for Delivery')
  await expect(admin.getByRole('status')).toContainText('Out for Delivery')
  await dialog.getByLabel('Status', { exact: true }).selectOption('Delivered')
  await expect(admin.getByRole('status')).toContainText('Status changed to Delivered')
  await expect(dialog.getByText('Paid', { exact: true })).toBeVisible()
  await admin.close()

  await customerLogin(page)
  await page.goto(`/order-tracking?order=${orderNumber}`)
  await page.getByPlaceholder(/Email or phone/).fill(creds.customer.email)
  await page.getByRole('button', { name: 'Track' }).click()
  await expect(page.getByText('Tracking reference:')).toContainText('PATHAO-998877')
  await expect(page.getByText('Delivered', { exact: true }).first()).toBeVisible()

  await page.goto('/product/65w-gan-fast-charger')
  await page.getByRole('tab', { name: /Reviews/ }).click()
  await page.getByRole('radio', { name: '4 stars' }).click()
  await page.getByPlaceholder('What did you like or dislike?').fill('Charges my phone quickly, runs a little warm.')
  await page.getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByText(/appear after moderation/)).toBeVisible()
  await expect(page.getByText('Charges my phone quickly')).toHaveCount(0)   // not public before approval
})

test('review moderation (Super Admin): approving publishes the review and updates the rating', async ({ page, browser }) => {
  await adminLogin(page, creds.superAdmin)
  await page.getByRole('link', { name: 'Reviews' }).click()
  const row = page.locator('tr').filter({ hasText: 'GaN' })
  await expect(row).toContainText('Pending')
  await row.getByRole('button', { name: 'Approve' }).click()
  await expect(row).toContainText('Approved')
  const shop = await browser.newPage()
  await shop.goto('/product/65w-gan-fast-charger')
  await shop.getByRole('tab', { name: /Reviews/ }).click()
  await expect(shop.getByText('Charges my phone quickly')).toBeVisible()
  await expect(shop.getByText('Verified purchase').first()).toBeVisible()
  await shop.close()
})

test('dashboard and sales reports reflect the delivered order (Super Admin)', async ({ page }) => {
  await adminLogin(page, creds.superAdmin)
  const revenue = page.locator('div').filter({ hasText: /^Total revenue/ }).last()
  await expect(revenue).toContainText('৳6,400')
  await expect(page.getByText('Delivered orders')).toBeVisible()
  await page.getByRole('link', { name: 'Sales reports' }).click()
  await expect(page.getByRole('heading', { name: 'Sales reports' })).toBeVisible()
  await page.getByRole('tab', { name: 'daily' }).click()
  await expect(page.getByText('Revenue in range')).toBeVisible()
  await expect(page.locator('main')).toContainText('65W GaN Fast Charger')       // product performance table
  await sidebar(page).getByRole('link', { name: 'Notifications' }).click()
  await expect(page.getByText(/New order VLT-/).first()).toBeVisible()
})
