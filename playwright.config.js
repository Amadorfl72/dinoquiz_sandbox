module.exports = {
  testDir: './tests/pwa',
  testMatch: [
    'performance.test.js',
    'installability.test.js',
    'offline-support.test.js',
  ],
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'node server.js',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
};
