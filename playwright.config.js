const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 0,
    navigationTimeout: 0,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // PWA and Service Worker tests require standard browser context
        launchOptions: {
          args: ['--enable-features=NetworkService']
        }
      },
    },
  ],
  webServer: {
    command: 'npm run start',
    port: 3000,
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
});