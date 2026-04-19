import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // ── Auth setup ──────────────────────────────────────────────────────────
    {
      name: 'setup-contact',
      testMatch: /contact\.setup\.ts/,
    },
    {
      name: 'setup-customer',
      testMatch: /customer\.setup\.ts/,
    },

    // ── Test projects ────────────────────────────────────────────────────────
    {
      name: 'anonymous',
      testMatch: /anonymous\/.+\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'contact',
      testMatch: /contact\/.+\.spec\.ts/,
      dependencies: ['setup-contact'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/storage-state/contact.json',
      },
    },
    {
      name: 'customer',
      testMatch: /customer\/.+\.spec\.ts/,
      dependencies: ['setup-customer'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/storage-state/customer.json',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
