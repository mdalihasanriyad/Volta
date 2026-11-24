# End-to-end tests

Playwright specs for the whole shop: storefront, customer journey, admin panel, permissions, security, responsive layout and accessibility.

## Run against a real stack (test database only)
```bash
npm install && npx playwright install chromium
npm run seed          # super admin + sample catalog
npm run seed:e2e      # test customer + two limited admins (refuses NODE_ENV=production)
npm run dev:api & npm run dev &
npm run e2e           # desktop; the "@responsive" tests also run on a phone profile
```
Set `E2E_BASE_URL` to test a deployed preview, and `E2E_SUPER_EMAIL` / `E2E_SUPER_PASSWORD` to your seeded Super Admin (the defaults match the offline sandbox).

**Use a throwaway database.** The specs create and delete products, change shipping/currency/settings and place orders, and they expect a freshly seeded catalog (28 sample products). Never point them at production.

Two specs need to read emails (registration verification, password reset). They run only in the offline sandbox (`SANDBOX=1`) and are skipped elsewhere; test those two flows by hand with your Resend inbox.

## Offline sandbox
`tools/sandbox` runs the same specs without network access (stand-in libraries, in-memory database, real routes/controllers). It exists for development in restricted environments, see `docs/TEST_REPORT.md` for what it proves and what it does not.
