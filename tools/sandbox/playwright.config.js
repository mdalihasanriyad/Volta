// Runs the portable specs in /e2e against the offline sandbox (real app code + in-memory database).
import { defineConfig } from '@playwright/test'
process.env.SANDBOX = '1'
export default defineConfig({
  testDir: '../../e2e', timeout: 45000, expect: { timeout: 8000 }, workers: 1, retries: 0, fullyParallel: false, reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'off', screenshot: 'only-on-failure', video: 'off' },
  outputDir: '/tmp/pw-results',
})
