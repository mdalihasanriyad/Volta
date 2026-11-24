# Admin access rules

Generated from `tests/helpers/adminRules.mjs`. `npm test` walks every real route in `api/routes/admin.js` with 15 kinds of caller
and fails if any route lets someone in (or keeps someone out) against this table. Run `node scripts/permissions-doc.mjs` to refresh this file.

Routes are relative to `/api/admin`.

## Public (sign-in only)

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/session`

## Any signed-in, active admin

- `GET /auth/me`
- `PATCH /auth/password`
- `GET /dashboard`
- `GET /lookups`
- `GET /notifications`
- `PATCH /notifications/:id/read`

## Permission: banners

- `GET /banners`
- `POST /banners`
- `PATCH /banners/:id`
- `DELETE /banners/:id`

## Permission: categories

- `GET /categories`
- `POST /categories`
- `PATCH /categories/:id`
- `DELETE /categories/:id`

## Permission: customers

- `GET /customers`
- `PATCH /customers/:id`

## Permission: inventory

- `GET /inventory`
- `GET /inventory/movements`
- `POST /inventory/adjust`

## Permission: orders

- `GET /orders`
- `GET /orders/:id`
- `PATCH /orders/:id/status`
- `PATCH /orders/:id`
- `POST /orders/:id/cancel`

## Permission: products

- `GET /products`
- `POST /products`
- `GET /products/:id`
- `PATCH /products/:id`
- `DELETE /products/:id`
- `POST /products/:id/variants`
- `PATCH /variants/:id`
- `GET /brands`
- `POST /brands`
- `PATCH /brands/:id`
- `DELETE /brands/:id`

## Permission: products or banners or categories

- `POST /uploads/sign`
- `POST /uploads/delete`

## Permission: reviews

- `GET /reviews`
- `PATCH /reviews/:id`

## Super Admin only

- `GET /sales`
- `GET /coupons`
- `POST /coupons`
- `PATCH /coupons/:id`
- `DELETE /coupons/:id`
- `GET /shipping-zones`
- `POST /shipping-zones`
- `PATCH /shipping-zones/:id`
- `DELETE /shipping-zones/:id`
- `GET /currencies`
- `POST /currencies`
- `PATCH /currencies/:id`
- `DELETE /currencies/:id`
- `GET /settings`
- `PUT /settings`
- `GET /admins`
- `POST /admins`
- `PATCH /admins/:id`
- `GET /logs`

## Rules that are enforced on the server

- A **Super Admin** passes every check. A regular **Admin** only passes routes for permissions a Super Admin granted.
- Admin accounts are read from the database on **every request**: suspending an admin, revoking a permission, or bumping their session version takes effect on their next request.
- A customer session cannot be used as an admin session and the other way round (different token audience and cookie).
- Permission checks run **before** request validation, so a denied admin never sees field-level errors.
- Admins cannot create admins, change any admin account (including their own), see financial reports, coupons, shipping, currency, SEO, content, global/security settings or activity logs.
- Cost prices and inventory valuation are Super Admin only: the API strips `costPrice` for regular admins and ignores it when they write.
- Dashboard revenue, units sold and best sellers are only included for Super Admins.
- A Super Admin account cannot be created, edited or suspended through the API.
