'use strict';

const { defineConfig, devices } = require('@playwright/test');

/**
 * Real-browser e2e config (TRIOFSND-111): jest/jsdom (jest.config.js) can't
 * run a service worker or a real network stack, so the "jugar una partida
 * completa sin conexión" scenario needs an actual Chromium instance against
 * the static app shell (tests/e2e/server.js serves public/ over HTTP).
 */
const PORT = process.env.DINOQUIZ_E2E_PORT || 4173;

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  timeout: 90_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node ${JSON.stringify(require('path').resolve(__dirname, 'tests/e2e/server.js'))}`,
    port: Number(PORT),
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
