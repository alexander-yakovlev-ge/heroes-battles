import { defineConfig, devices } from '@playwright/test'

/**
 * e2e-сценарии web-клиента (§15.1). Клиент и эмуляторы поднимает docker compose;
 * адрес клиента — E2E_BASE_URL (в Docker — http://emulators:5000).
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5000',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  outputDir: 'test-results',
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
