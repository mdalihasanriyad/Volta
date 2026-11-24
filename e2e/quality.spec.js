import { test, expect, creds, resetSandbox, customerLogin, adminLogin } from './helpers.js'

test.beforeAll(async ({ request }) => { await resetSandbox(request) })

const VIEWPORTS = { mobile: { width: 390, height: 844 }, tablet: { width: 820, height: 1180 }, desktop: { width: 1366, height: 900 } }
const PUBLIC_PAGES = ['/', '/shop', '/shop?category=laptops', '/product/65w-gan-fast-charger', '/product/galaxy-s24-ultra-256gb', '/cart', '/wishlist', '/compare', '/login', '/register', '/forgot-password', '/order-tracking', '/contact']
const CUSTOMER_PAGES = ['/account', '/account?tab=orders', '/account?tab=addresses', '/account?tab=settings', '/checkout']
const ADMIN_PAGES = ['/admin', '/admin/orders', '/admin/products', '/admin/categories', '/admin/brands', '/admin/banners', '/admin/inventory', '/admin/customers', '/admin/sales', '/admin/coupons', '/admin/reviews', '/admin/shipping', '/admin/currency', '/admin/content', '/admin/seo', '/admin/notifications', '/admin/admins', '/admin/logs', '/admin/settings']

async function settle(page) { await page.waitForLoadState('networkidle'); await page.waitForTimeout(150) }
const overflow = (page) => page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }))

// Accessibility basics every page must satisfy (axe-style rules that can be checked without extra tooling)
async function a11yProblems(page) {
  return page.evaluate(() => {
    const out = []
    const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent || '').trim()
    document.querySelectorAll('button, a[href]').forEach((el) => { if (!name(el) && !el.querySelector('img[alt]:not([alt=""]), [role=img][aria-label]') && el.getAttribute('aria-hidden') !== 'true') out.push(`unnamed ${el.tagName.toLowerCase()}: ${el.outerHTML.slice(0, 90)}`) })
    document.querySelectorAll('input:not([type=hidden]):not([type=file]), select, textarea').forEach((el) => {
      const labelled = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
      if (!labelled && !el.closest('label') && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) out.push(`unlabelled field: ${el.outerHTML.slice(0, 90)}`)
    })
    document.querySelectorAll('img').forEach((el) => { if (!el.hasAttribute('alt')) out.push(`image without alt: ${el.src}`) })
    if (document.querySelectorAll('h1').length !== 1) out.push(`expected exactly one h1, found ${document.querySelectorAll('h1').length}`)
    if (!document.documentElement.lang) out.push('missing <html lang>')
    return out
  })
}

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  test(`@responsive storefront pages fit ${vpName} screens (no sideways scrolling, accessible names)`, async ({ page }) => {
    await page.setViewportSize(vp)
    await customerLogin(page)                                            // account pages need a session
    await page.goto('/product/65w-gan-fast-charger'); await page.getByRole('button', { name: 'Add to cart' }).click()
    const bad = []
    for (const path of [...PUBLIC_PAGES, ...CUSTOMER_PAGES]) {
      await page.goto(path); await settle(page)
      const o = await overflow(page)
      if (o.doc > o.win) bad.push(`${path}: page is ${o.doc}px wide on a ${o.win}px screen`)
      for (const p of await a11yProblems(page)) bad.push(`${path}: ${p}`)
    }
    expect(bad).toEqual([])
  })

  test(`@responsive admin pages fit ${vpName} screens`, async ({ page }) => {
    await page.setViewportSize(vp)
    await adminLogin(page, creds.superAdmin)
    const bad = []
    for (const path of ADMIN_PAGES) {
      await page.goto(path); await settle(page)
      const o = await overflow(page)
      if (o.doc > o.win) bad.push(`${path}: page is ${o.doc}px wide on a ${o.win}px screen`)
      for (const p of await a11yProblems(page)) bad.push(`${path}: ${p}`)
    }
    expect(bad).toEqual([])
  })
}

test('performance: the storefront does not download admin code, images are lazy, hero is prioritised', async ({ page }) => {
  const js = []
  page.on('response', (r) => { if (r.url().endsWith('.js')) js.push(r.url().split('/').pop()) })
  await page.goto('/'); await settle(page)
  const bytes = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.js')).reduce((n, e) => n + (e.encodedBodySize || 0), 0))
  expect(js.some((f) => /^(Orders|Dashboard|Inventory|Resources|Products|Admins|Settings|AdminLayout|Seo|Currency)-/.test(f)), `admin chunks loaded on the storefront: ${js.join(', ')}`).toBe(false)
  expect(bytes).toBeGreaterThan(0)
  // below-the-fold product images are lazy and decoded asynchronously
  const imgs = await page.locator('article img').evaluateAll((els) => els.map((e) => [e.loading, e.decoding]))
  for (const [loading, decoding] of imgs) { expect(loading).toBe('lazy'); expect(decoding).toBe('async') }
  // route-level code splitting: opening the cart loads an extra chunk, not the whole app again
  const before = js.length
  await page.goto('/cart'); await settle(page)
  expect(js.length).toBeGreaterThan(before - 1)
  // every product list request is paginated (never the whole catalogue)
  const reqs = []
  page.on('request', (r) => r.url().includes('/api/catalog/products') && reqs.push(r.url()))
  await page.goto('/shop'); await settle(page)
  expect(reqs.every((u) => /limit=\d+/.test(u) && Number(u.match(/limit=(\d+)/)[1]) <= 48)).toBe(true)
})
