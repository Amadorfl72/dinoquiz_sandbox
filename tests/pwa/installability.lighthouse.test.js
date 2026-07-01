const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const config = require('lighthouse/lighthouse-core/config/lr-desktop-config.js');

describe('TRIOFSND-53: PWA Installability - Lighthouse Audit', () => {
  let chrome;
  let results;

  beforeAll(async () => {
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });
    const options = {
      logLevel: 'error',
      port: chrome.port,
      onlyCategories: ['pwa'],
    };
    results = await lighthouse('http://localhost:3000', options, config);
  }, 60000);

  afterAll(async () => {
    if (chrome) await chrome.kill();
  });

  test('installable-manifest audit should pass', () => {
    const audit = results.lhr.audits['installable-manifest'];
    expect(audit).toBeDefined();
    expect(audit.score).toBe(1);
  });

  test('maskable-icon audit should pass', () => {
    const audit = results.lhr.audits['maskable-icon'];
    expect(audit).toBeDefined();
    expect(audit.score).toBe(1);
  });

  test('webapp-install-banner audit should pass', () => {
    const audit = results.lhr.audits['webapp-install-banner'];
    expect(audit).toBeDefined();
    expect(audit.score).toBe(1);
  });
});
