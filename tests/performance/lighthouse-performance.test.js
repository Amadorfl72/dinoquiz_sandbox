const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const config = require('lighthouse/lighthouse-core/config/lr-desktop-config.js');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('TRIOFSND-53: Lighthouse Performance Audit - Home Screen', () => {
  let chrome;
  let results;

  beforeAll(async () => {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });
    const options = {
      logLevel: 'error',
      port: chrome.port,
      onlyCategories: ['performance'],
    };
    results = await lighthouse(BASE_URL, options, config);
  }, 120000);

  afterAll(async () => {
    if (chrome) await chrome.kill();
  });

  test('TTI (Time to Interactive) should be under 2000ms', () => {
    const tti = results.lhr.audits['interactive'];
    expect(tti).toBeDefined();
    expect(tti.numericValue).toBeLessThan(2000);
  });

  test('FCP (First Contentful Paint) should be under 1800ms', () => {
    const fcp = results.lhr.audits['first-contentful-paint'];
    expect(fcp).toBeDefined();
    expect(fcp.numericValue).toBeLessThan(1800);
  });

  test('LCP (Largest Contentful Paint) should be under 2500ms', () => {
    const lcp = results.lhr.audits['largest-contentful-paint'];
    expect(lcp).toBeDefined();
    expect(lcp.numericValue).toBeLessThan(2500);
  });

  test('TBT (Total Blocking Time) should be under 200ms', () => {
    const tbt = results.lhr.audits['total-blocking-time'];
    expect(tbt).toBeDefined();
    expect(tbt.numericValue).toBeLessThan(200);
  });

  test('CLS (Cumulative Layout Shift) should be under 0.1', () => {
    const cls = results.lhr.audits['cumulative-layout-shift'];
    expect(cls).toBeDefined();
    expect(cls.numericValue).toBeLessThan(0.1);
  });

  test('Performance score should be at least 90', () => {
    const perfScore = results.lhr.categories.performance.score;
    expect(perfScore).toBeGreaterThanOrEqual(0.9);
  });

  test('No render-blocking resources should be detected', () => {
    const renderBlocking = results.lhr.audits['render-blocking-resources'];
    if (renderBlocking && renderBlocking.score !== null) {
      expect(renderBlocking.score).toBe(1);
    }
  });

  test('Unused JavaScript should be under 200KB', () => {
    const unusedJs = results.lhr.audits['unused-javascript'];
    if (unusedJs && unusedJs.numericValue !== null) {
      expect(unusedJs.numericValue).toBeLessThan(200000);
    }
  });

  test('Images should be properly sized and optimized', () => {
    const usesOptimizedImages = results.lhr.audits['uses-optimized-images'];
    if (usesOptimizedImages && usesOptimizedImages.score !== null) {
      expect(usesOptimizedImages.score).toBe(1);
    }
  });

  test('Text content should remain visible during webfont loads', () => {
    const fontDisplay = results.lhr.audits['font-display'];
    if (fontDisplay && fontDisplay.score !== null) {
      expect(fontDisplay.score).toBe(1);
    }
  });
});
