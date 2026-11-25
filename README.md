# Volta – Gadget E-commerce: UI, admin, backend, integration

React + Vite + Tailwind frontend and an Express + MongoDB API in the same root project (JavaScript only). The storefront and admin panel now run entirely on the API (no mock data in the app).

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
```

## Setup

Requires Node 20+ and a MongoDB Atlas cluster (transactions need a replica set; Atlas has one).

```bash
cp .env.example .env     # fill MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET (32+ random chars each), CLIENT_URL, SEED_SUPER_*
npm install
npm run seed             # Super Admin, BDT currency, starter shipping zones, sample catalog
npm run dev:api          # API on http://localhost:5000   (Vite proxies /api to it)
npm run dev              # frontend on http://localhost:5173
npm test                 # offline logic tests
```

Generate secrets with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### Accounts and services (Phase 4)
1. **MongoDB Atlas**: create a cluster and a database user, allow your IP (or 0.0.0.0/0 on Vercel), copy the connection string into `MONGODB_URI`.
2. **First admin**: put `SEED_SUPER_NAME`, `SEED_SUPER_EMAIL`, `SEED_SUPER_PASSWORD` (10+ chars, letters and numbers) in `.env`, run `npm run seed`, then sign in at `/admin/login`. Remove the password from `.env` afterwards.
3. **Cloudinary**: copy cloud name, API key and API secret into `CLOUDINARY_*`. Uploads are signed by the server and go straight from the browser to Cloudinary (JPG, PNG, WebP up to 5 MB). Without these, the admin image uploader shows "not configured".
4. **Google sign-in**: in Google Cloud Console create an OAuth client of type *Web application*, add your site (for example `http://localhost:5173` and your Vercel URL) under *Authorized JavaScript origins*, then set `GOOGLE_CLIENT_ID`. No redirect URI is needed. Without it the button shows "not available yet".
5. **Resend**: set `RESEND_API_KEY` and `EMAIL_FROM` (a sender on a domain you verified in Resend). Without them, verification and reset links are printed in the API console.
6. `CLIENT_URL` must be exactly the address you open in the browser (for local development `http://localhost:5173`). The API rejects state-changing requests from any other origin.

First checks after setup: register a customer, open the verification link (from the email or API console), add a product to the cart, check out with Cash on Delivery, then as admin move the order through Confirmed, Shipped and Delivered, and finally review the product as that customer.

Notes
- Admin accounts cannot be registered publicly. The first Super Admin comes from the seed script; after that Super Admins create admins.
- USD is only created when `SEED_USD_RATE` is set (1 BDT = ? USD). Otherwise add it in the admin with a rate you trust.
- Seeded shipping fees, thresholds and COD regions are starting values. Review them before launch.
- Without `RESEND_API_KEY` and `EMAIL_FROM`, emails are printed to the server console (verification and reset links) instead of sent.
- Passwords use `bcryptjs` (pure JavaScript) instead of native `bcrypt`, which avoids binary build problems on Vercel.

### API overview (all under `/api`)
| Area | Endpoints |
|---|---|
| Health | `GET /health` |
| Customer auth | `POST /auth/register, login, logout, refresh, verify-email, resend-verification, forgot-password, reset-password` · `GET /auth/me` · `PATCH /auth/password, profile` |
| Storefront | `GET /catalog/products, products/suggest, products/:slug, categories, brands, banners, home, currencies, settings` · `POST /catalog/newsletter` |
| Customer (login required) | `/addresses`, `/cart`, `/wishlist/:productId`, `POST /checkout/quote`, `POST /orders`, `GET /orders`, `GET /orders/:number`, `POST /orders/:number/cancel, return`, `POST /reviews`, `GET /reviews/mine` |
| Public tracking | `GET /orders/track/:number?email=…` or `?phone=…` |
| Admin auth | `POST /admin/auth/login, logout, refresh` · `GET /admin/auth/me` |
| Admin (permission based) | `products`, `brands` (products) · `categories` · `banners` · `inventory` · `orders` · `customers` · `reviews` · `dashboard`, `notifications`, `lookups` (any admin) |
| Super Admin only | `sales`, `coupons`, `shipping-zones`, `currencies`, `settings`, `admins`, `logs` |

## Tests
- `npm test` (55 tests, no network, no database): the app's own routes, middleware and services run against in-memory stand-ins. Includes a permission matrix of every admin route and race-condition tests for stock and coupons (`tests/`).
- `npm run e2e` (45 Playwright tests): the whole shop in a real browser, see `e2e/README.md`. Use a throwaway database.
- `docs/TEST_REPORT.md` lists what was tested, what was fixed, what the offline setup could not prove, and the checks to do before launch. `docs/ADMIN_PERMISSIONS.md` is the readable permission table.

## Deployment (Vercel)
1. Push the project to GitHub (never commit `.env`) and import it in Vercel. Framework preset: Vite. Root directory: the project root.
2. In *Project Settings > Environment Variables* add every variable from `.env.example`: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL` (your production URL, no trailing slash), `API_URL` (same URL), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CLOUDINARY_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `DEFAULT_CURRENCY=BDT`.
3. Deploy. `vercel.json` sends `/api/*`, `/sitemap.xml` and `/robots.txt` to the serverless API and every other path to the React app, so refreshing nested URLs (product pages, `/admin/...`) works.
4. From your computer run `npm run seed` once with the production `MONGODB_URI` to create the first Super Admin and starter data.
5. Add the production domain to the Google OAuth *Authorized JavaScript origins*.
6. In MongoDB Atlas allow Vercel to connect (Network Access). The API reuses one cached connection per serverless instance.

Known limits: no background jobs run on Vercel, so low-stock and order notifications are created during the request that triggers them; images never touch the server disk (they go to Cloudinary).
# Volta
