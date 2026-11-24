// End-to-end tests against a REAL running stack:  npm run dev:api  +  npm run dev  (or a deployed URL via E2E_BASE_URL).
// See e2e/README.md for the required environment variables.
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', timeout: 60000, expect: { timeout: 10000 }, workers: 1, retries: 1, reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@responsive/ }],
})
