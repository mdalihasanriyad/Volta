import { test, expect, resetSandbox } from './helpers.js'

test.describe.configure({ mode: 'serial' })
test.beforeAll(async ({ request }) => { await resetSandbox(request) })

test('home page loads real data and a clean console', async ({ page }) => {
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Shop by category' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Featured products' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Best sellers' })).toBeVisible()
  await expect(page.locator('article').first()).toBeVisible()
  expect(errors, 'anonymous visit must not log any console error (including 401s)').toEqual([])
})

test('shop: server-side filters, sorting and pagination', async ({ page }) => {
  await page.goto('/shop')
  await expect(page.getByText('28 products')).toBeVisible()
  await expect(page.locator('article')).toHaveCount(12)
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toBeVisible()
  await page.getByRole('button', { name: '3', exact: true }).click()
  await expect(page.locator('article')).toHaveCount(4)
  await page.goto('/shop?category=laptops')
  await expect(page.getByRole('heading', { name: 'Laptops' })).toBeVisible()
  await expect(page.locator('article')).toHaveCount(4)
  // sort by price, low to high
  await page.getByLabel('Sort by').selectOption('price-asc')
  const prices = (await page.locator('article').evaluateAll((els) => els.map((e) => e.textContent.match(/৳([\d,]+)/)[1].replace(/,/g, '')))).map(Number)
  expect([...prices].sort((a, b) => a - b)).toEqual(prices)
  // price range + in-stock filter
  await page.goto('/shop?min=10000&max=30000&stock=1')
  await expect(page.locator('article').first()).toBeVisible()
  const filtered = (await page.locator('article').evaluateAll((els) => els.map((e) => Number(e.textContent.match(/৳([\d,]+)/)[1].replace(/,/g, ''))))) 
  expect(filtered.length).toBeGreaterThan(0)
  expect(filtered.every((p) => p >= 10000 && p <= 30000)).toBe(true)
  await page.goto('/shop?q=zzzzzz')
  await expect(page.getByText('No products match your filters')).toBeVisible()
})

test('search by name, SKU and brand with suggestions', async ({ page }) => {
  await page.goto('/')
  const box = page.getByLabel('Search products').first()
  await box.fill('galaxy')
  await expect(page.getByRole('button', { name: /Galaxy S24 Ultra/ })).toBeVisible()
  await box.press('Enter')
  await expect(page).toHaveURL(/\/shop\?q=galaxy/)
  await expect(page.locator('article').first()).toContainText('Galaxy')
  await page.goto('/shop?q=VLT-LAP')   // SKU prefix
  await expect(page.locator('article').first()).toBeVisible()
  await page.goto('/shop?q=Logitech')  // brand
  await expect(page.locator('article').first()).toContainText('Logitech')
})

test('product page: variants change price and SKU, add to cart updates the cart', async ({ page }) => {
  await page.goto('/shop?q=Galaxy S24')
  await page.getByRole('link', { name: /Galaxy S24 Ultra/ }).first().click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Galaxy S24 Ultra')
  const price = async () => (await page.locator('main').getByText(/^৳[\d,]+$/).first().textContent())
  const first = await price()
  await page.getByRole('button', { name: '512GB' }).click()
  await expect.poll(price).not.toBe(first)
  await expect(page.getByText(/SKU VLT-SMA-1000-3/)).toBeVisible()
  await page.getByRole('button', { name: 'Increase quantity' }).click()
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(page.getByRole('status')).toContainText('Added to cart')
  await expect(page.getByRole('link', { name: 'Cart' }).first()).toContainText('2')
  await page.getByRole('link', { name: 'Cart' }).first().click()
  await expect(page.getByRole('heading', { name: /Shopping cart/ })).toBeVisible()
  await expect(page.getByText('512GB', { exact: false }).first()).toBeVisible()
})

test('wishlist and compare work for guests', async ({ page }) => {
  await page.goto('/shop?category=laptops')
  const cards = page.locator('article')
  await cards.nth(0).getByRole('button', { name: 'Add to wishlist' }).click()
  await cards.nth(0).getByRole('button', { name: 'Add to compare' }).click()
  await cards.nth(1).getByRole('button', { name: 'Add to compare' }).click()
  await page.goto('/wishlist')
  await expect(page.getByRole('heading', { name: /Wishlist \(1\)/ })).toBeVisible()
  await page.goto('/compare')
  await expect(page.getByRole('heading', { name: 'Compare products' })).toBeVisible()
  await expect(page.locator('table thead th')).toHaveCount(3)
  await expect(page.getByRole('rowheader', { name: 'Price' })).toBeVisible()
})

test('unknown product and unknown route show friendly pages', async ({ page }) => {
  await page.goto('/product/does-not-exist')
  await expect(page.getByText('Product not found')).toBeVisible()
  await page.goto('/this/page/does/not/exist')
  await expect(page.getByText('Page not found')).toBeVisible()
})

test('guests cannot check out: they are sent to sign in', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText(/Guest checkout is not available/)).toBeVisible()
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login/)
})

test('contact form and newsletter', async ({ page }) => {
  await page.goto('/contact')
  await page.getByLabel('Name').fill('Rafiq')
  await page.getByLabel('Email').fill('rafiq@example.test')
  await page.getByLabel('Subject').fill('Order question')
  await page.getByLabel('Message').fill('Where can I see my order status?')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('status')).toContainText('reply within one working day')
  await page.goto('/')
  await page.getByLabel('Email address').fill('news@example.test')
  await page.getByRole('button', { name: 'Subscribe' }).click()
  await expect(page.getByRole('status')).toContainText('Subscribed')
})
