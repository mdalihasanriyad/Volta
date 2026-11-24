# Phase 6 test report

Date: 2026-11-24. Scope: whole application (storefront, customer account, admin panel, API, deployment configuration).

## Results

| Suite | Command | Tests | Result |
|---|---|---|---|
| Logic, API and permission tests (no browser, no database) | `npm test` | 55 | all pass |
| End-to-end in Chromium (offline sandbox) | `tools/sandbox/e2e.sh` | 45 | all pass |

**What the 55 unit/API tests cover:** pricing, coupons, shipping zones, order-status rules, currency maths; every admin route against 15 kinds of caller (61 routes, 900+ checks); order placement, cancellation, returns, reviews, variants and inventory, including 10 simultaneous orders for 3 units and racing coupons; cost-price protection and admin idle timeout; validators, sanitiser, origin guard, error handler, Cloudinary signing; environment validation, database-failure handling (503, no cached failure), Vercel rewrite table, ESM/root-deployment rules and "no secret in the browser code".
Deliberate bugs (removed guards, wrong permission, trusted browser price, no restock, no COD check, leaked cost price, ignored timeout) were injected in turn and each one made a test fail.

**What the 45 browser tests cover**
- Customer: home, search (name/SKU/brand with suggestions), filters, sorting, pagination, variants (price and SKU change), cart (guest cart saved on the server after sign-in), wishlist, compare, registration with validation and duplicate email, email verification, sign in/out, wrong password, password change, forgot/reset password (link works once), profile, addresses, checkout (live totals, free delivery threshold, express, coupons, Cash on Delivery confirmation, stock deduction), COD-unavailable destination, USD display with BDT recording, order cancellation with stock restore, public tracking (number plus email), verified-purchase review, contact form, newsletter, guests blocked from checkout.
- Admin: sign in, Super Admin vs limited admin vs customer sessions, menu per role and direct URL blocking, server refusing what the menu hides, order lifecycle (invalid steps refused, tracking, notes, invoice, CSV), delivery marking COD paid, review moderation, dashboard and sales numbers, product create/edit/delete, image-upload guard, variants, inventory (never below zero, movements audited, cost column Super Admin only), categories/brands/banners (guarded deletes, banner appears on the homepage), coupons, shipping (COD switched off blocks checkout), currency (invalid rate refused, new currency appears in the shop), homepage sections and announcement, SEO title/canonical/structured data/sitemap/robots, maintenance mode, admin create/revoke/suspend/reactivate taking effect on the next request, Super Admin cannot be changed or promoted through the API, activity log with who/when and no passwords.
- Security over HTTP: NoSQL operators and HTML in input, HttpOnly + SameSite cookies, cross-site writes blocked, no guest checkout, other customers' orders invisible (404), price tampering ignored, mass assignment ignored, errors are JSON without stack traces.
- Responsive and accessibility: 13 storefront pages and 19 admin pages at phone (390), tablet (820) and desktop (1366) widths: no sideways scrolling, every button/link/field has an accessible name, images have alt text, exactly one h1, page language set.
- Performance (structural): admin code is not downloaded by the storefront, product images are lazy and decoded asynchronously, product lists are always paginated (limit at most 48).
- Browser console: every test fails on any uncaught error or console error (other than the browser's own line for an expected 4xx, or the deliberate 503 "image uploads not configured").

## Problems found and fixed in this phase
1. Every anonymous page view logged two 401 errors in the browser console (the "who am I" and refresh calls). `/auth/me` and the new `/admin/auth/session` now answer 200 with `null` for visitors and silently renew an expired access token.
2. The customer account page was 766 px wide on a 390 px phone (horizontal scrolling). Grid children can now shrink and the tab bar scrolls inside itself.
3. Pages without a main heading (empty compare, empty cart, empty checkout, 404, product not found, checkout itself). Page-level empty states are now h1 and checkout has a visible h1.
4. Cart and wishlist thumbnails were a second, unnamed link to the same product; they are now hidden from keyboard and screen readers.
5. Empty admin tables were clipped on phones; they now show a plain centred message.
Earlier in this phase's setup: cost prices and valuation hidden from regular admins, add-variant to existing products, real admin idle timeout (Phase 5 gaps) are covered by tests.

## What these tests do NOT prove (please read)
The sandbox that ran the browser tests has no network, so it uses stand-ins:
- **Libraries**: react-router, react-hook-form, zustand, axios and lucide icons are small re-implementations; React 19 and Tailwind 4 were used (the project pins React 18.3.1 and Tailwind 3.4). Layout and application logic are exercised for real, but a library-specific quirk could still appear with the real packages.
- **Database**: an in-memory database replaces MongoDB. It models the operations the app uses (atomic conditional updates, transactions with rollback, aggregation, populate), but indexes, real transactions, real query planning and Atlas behaviour are untested.
- **Server**: Express, helmet, CORS and rate limiting are stubbed, so security headers and rate-limit behaviour were not exercised; bcrypt and JWT were stand-ins.
- **Services**: Cloudinary uploads, Google sign-in and Resend email were not exercised beyond their "not configured" paths.
- **Performance**: no Vite production build, Lighthouse or Core Web Vitals numbers (not possible offline). Only structural checks above.
- **Browsers and devices**: Chromium only; no Safari, Firefox or real phones.

## Before launch (needs your environment)
1. `npm install`, `npm run build` (must succeed), `npm test`.
2. On a test database: `npm run seed`, `npm run seed:e2e`, run the API and the app, `npm run e2e`. Fix anything that differs from the sandbox.
3. Configure real Cloudinary, Google and Resend credentials and walk through the flows by hand once (upload an image, Google sign-in, verification and order emails).
4. Run Lighthouse (mobile) on the home, shop and product pages of a Vercel preview deployment; check security headers on `/api/health`.
5. Try the site on a real phone.
