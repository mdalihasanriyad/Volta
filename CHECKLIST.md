# Development checklist

Legend: [x] written, [~] written but not yet run/verified, [ ] not started.

## Phase 1 – Customer frontend UI (mock data)
- [x] Single-root project structure (src/, api/, models/, controllers/ … placeholders)
- [x] Tailwind design system (sky blue / black / white / gray), Manrope font
- [~] Header, announcement bar, debounced search with suggestions, currency switcher
- [~] Desktop mega menu (hover category list + subcategories)
- [~] Mobile drawer + bottom navigation (Home, Shop, Categories, Wishlist, Account); footer hidden on mobile
- [~] Homepage (hero slider, categories, product rails, promo, brands, recently viewed, newsletter)
- [~] Shop page (search, category/sub, price, stock, discount, rating, sort, pagination)
- [~] Product detail (gallery, color/model variants, qty, Add to cart, Buy now, wishlist, compare, specs, reviews, related, recently viewed)
- [~] Cart (qty, remove, coupon, shipping, free-shipping hint)
- [~] Wishlist, Compare (up to 4)
- [~] Login / Register (Google button + email form, mock only)
- [~] Customer account (profile, orders, addresses, wishlist, reviews, password)
- [~] Checkout (login required, COD only, COD region check, delivery method, order confirmation)
- [~] Order tracking, Contact, 404
- [x] Static checks: all 49 JS/JSX files parse; all relative imports resolve; mock data consistent
- [ ] `npm install` + `npm run dev` visual check  (needs a machine with network)
- [ ] `npm run build`
- [ ] Responsive check on real mobile / tablet / desktop

## Phase 2 – Admin UI (mock data)  — routes under /admin
- [~] Admin login (/admin/login) with demo accounts: Super Admin, Admin (Nadia), Suspended admin
- [~] Layout: sidebar (drawer on mobile), header, role badge, sign out, view store
- [~] Role-based menu + route guard (Super Admin sees 19 modules; Admin only assigned ones)
- [~] Dashboard: stats, sales trend (daily/weekly/monthly/yearly), orders by status, recent orders, best sellers, low stock (revenue hidden from Admin)
- [~] Products, Categories (parent + order), Brands, Banners: create / edit / delete / search
- [~] Inventory: variant-level stock, stock in/out, no negative stock, movement history, valuation (Super Admin)
- [~] Orders: filters, details, status, tracking, refund status, notes, cancel, printable invoice, CSV export
- [~] Customers, Reviews (approve/reject), Coupons, Shipping zones (COD per zone), SEO
- [~] Currency (rates, default, add currency), Content (section order/visibility), Notifications
- [~] Admin management (create, edit permissions, revoke, suspend/reactivate), Activity logs, Settings
- [x] Static checks: 70 files parse, full app bundles with esbuild (imports resolve), permission rules tested in Node
- [ ] `npm install` + `npm run dev` visual check of every admin page, desktop and mobile
- [ ] Real RBAC: enforced on the server in Phase 3 (menus here are UI only)

## Phase 3 – Backend and database (JavaScript, Express, Mongoose, one root)
- [x] Structure: api/ (Vercel entry + routes), models/, controllers/, services/, middleware/, validators/, config/, utils/, scripts/
- [x] 21 Mongoose models with indexes (User, Admin, Product, ProductVariant, Category, Brand, Banner, Cart, Wishlist, Order, Coupon, Review, Inventory, StockMovement, Address, ShippingZone, Currency, StoreSettings, Notification, Newsletter, ActivityLog)
- [x] MongoDB connection cached across serverless invocations; env validation (no insecure fallbacks)
- [x] Auth: register, login, logout, refresh, email verification, forgot/reset password, change password; HTTP-only cookies; separate customer and admin sessions; lockout after repeated failures
- [x] Admin RBAC in middleware, admin loaded from DB on every request (suspension/permission changes apply at once); Super-Admin-only routes; admins cannot create admins or edit their own account
- [x] Catalog API: server-side pagination, filters, sort, search (name/SKU/brand), product detail with variants + stock, home payload
- [x] Cart, wishlist, addresses, reviews (verified delivered purchase only, moderation, rating recompute)
- [x] Checkout: server-side pricing, coupon validation, shipping zone + COD-region check, currency snapshot, price snapshots, COD/unpaid/pending
- [x] Inventory: atomic conditional stock decrement (no overselling, no negative stock), transactions, movement audit trail, low-stock notifications
- [x] Order lifecycle rules, cancel with stock restore, return request, CSV export (formula-injection safe)
- [x] Currency rules (rates only from admin, base BDT, history never changes); sales and dashboard aggregations (revenue Super Admin only)
- [x] Security: helmet, CORS, rate limits, origin check, input sanitising, zod validation, safe error responses, audit log
- [x] Seed script (Super Admin from .env, BDT base, optional USD with YOUR rate, starter shipping zones, sample catalog)
- [x] Tests that pass offline: 15 (pricing, coupons, zones, status rules, currency, validators, sanitiser, origin guard, RBAC middleware, error handler)
- [ ] NOT yet run against a real MongoDB (nothing here can reach a database): models, transactions, aggregations, controllers and routes are syntax/bundle checked only
- [ ] `npm install`, `npm run seed`, `npm run dev:api`, manual API checks, then Phase 6 full test pass
- [ ] Google login, Cloudinary uploads (Phase 4); Resend emails are coded but need RESEND_API_KEY and a verified sender

## Phase 4 – Frontend and backend integration (no mock data left in the app)
- [x] Shared API client (axios, cookies, silent token refresh, readable errors); sample data moved out of the UI into scripts/seedData.js
- [x] Catalog bootstrap: categories, brands, currencies, public settings; maintenance mode; error and loading states
- [x] Home: banners, sections order and visibility from the admin, featured/new/best/offers/recommended/recently viewed
- [x] Shop: server-side search (name, SKU, brand), category, subcategory, price, stock, discount, rating, sort, pagination
- [x] Product: variants (model, colour) with their own SKU/price/stock, gallery, specs, verified reviews, related, SEO tags and structured data
- [x] Cart: device cart for guests, saved on the server after sign-in (merged on login); price/stock refresh; wishlist (synced); compare
- [x] Auth: register, login, logout, Google sign-in, email verification, forgot/reset password, change password
- [x] Checkout: login required, saved addresses, live server quote (delivery zone, coupon, free shipping, currency), COD-region block, stock issues, COD confirmation, order creation, email verified required
- [x] Account: profile, orders (track, cancel, return request), addresses, wishlist, reviews, password
- [x] Public order tracking (order number + email/phone), contact form, newsletter
- [x] Admin: real login and permissions; dashboard; products (images, variants, stock opening); categories; brands; banners; inventory; orders (status, tracking, notes, refunds, returns, invoice, CSV); customers; reviews; coupons; shipping zones; currency; content; SEO; notifications; admins; logs; settings
- [x] Cloudinary: signed direct uploads, multiple images, replace/remove (old files deleted after saving), responsive delivery (f_auto, q_auto, srcset)
- [x] Resend: verification, reset, order confirmation and status emails (REST API)
- [x] Sitemap and robots.txt generated by the API; canonical URL, Open Graph, Product JSON-LD
- [x] 20 offline tests pass; whole frontend, API and seed script bundle without errors; every named import resolves
- [ ] NOT yet run in a browser or against MongoDB/Cloudinary/Google/Resend (needs real credentials and a machine with network)
- [ ] Phase 5 verification of every admin permission against a live API; Phase 6 full test pass

## Phase 5 – Complete admin functionality and permission verification
- [x] Gaps closed: cost prices and inventory valuation are Super Admin only (API strips/ignores them for admins); add variants to an existing product (own SKU, price, opening stock); admin idle timeout now enforced; removed a settings toggle that did nothing
- [x] Permission matrix test: all 61 admin routes x 15 kinds of caller (no session, customer session, Super Admin, admin with every permission, admin with none, each single permission, suspended, revoked session, deleted admin) checked against a hand-written table (docs/ADMIN_PERMISSIONS.md is generated from it)
- [x] Also verified: permission check runs before validation, admins cannot edit themselves or create admins, suspension/revocation applies on the very next request, customer and admin sessions are not interchangeable, no guest checkout, order placement needs a verified email
- [x] Order and inventory logic verified against an in-memory database: DB-priced orders, COD/zone refusal, rollback on partial failure, 10 simultaneous orders for 3 units (exactly 3 succeed), coupon usage limits under race, cancel/restock, status workflow, returns, audited stock changes, low-stock alert, verified-purchase reviews, variant conversion
- [x] Mutation checks: 10 deliberate bugs (removed guards, wrong permission, trusted price, no restock, no COD check, cost price leak, no idle timeout ...) were each caught by a failing test, then reverted
- [x] 50 offline tests pass (`npm test`)
- [ ] NOT verified: anything that needs the real stack (Express wiring, MongoDB transactions and indexes, Cloudinary, Google, Resend) and the browser UI. The in-memory tests model MongoDB's atomic single-document updates; they do not replace a run against Atlas
- [ ] Phase 6: full end-to-end test on a real environment, responsive/browser/console checks, performance

## Phase 6 – Testing and optimization
- [x] 55 logic/API/permission/platform tests pass (`npm test`)
- [x] 45 browser tests pass in Chromium against the offline sandbox (`tools/sandbox/e2e.sh`); the same specs run against a real stack with `npm run e2e` (see e2e/README.md)
- [x] Customer tests: registration, verification, sign in, Google button state, browse, search, filters, cart, wishlist, compare, checkout, COD order creation, order tracking, dashboard, verified-purchase reviews
- [x] Admin tests: Super Admin and Admin sign in, admin creation, permission assignment and revocation, unauthorized access prevention, product management, inventory, order updates, banners, sales analytics
- [x] Technical tests: API validation, error handling, database failure handling, security, responsive design (3 widths, 32 pages), accessibility basics, console errors, Vercel routing, deployment rules
- [x] Issues found and fixed: 401 console noise, phone overflow on the account page, missing h1 headings, duplicate unnamed links, clipped empty tables (docs/TEST_REPORT.md)
- [ ] NOT done (needs your environment): real `npm run build`, run against MongoDB Atlas, real Cloudinary/Google/Resend, Lighthouse/Core Web Vitals numbers, Safari/Firefox/real devices

## Phase 7
- [ ] Not started
