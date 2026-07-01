import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.HOME_URL || 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'tablet-landscape',
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'tablet-portrait',
      use: { viewport: { width: 800, height: 1280 } },
    },
  ],
});
