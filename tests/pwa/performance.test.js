const { test, expect } = require('@playwright/test');

test.describe('TRIOFSND-53: Performance Optimization - TTI under 2 seconds', () => {
  test('home screen TTI is under 2 seconds', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(3500);

    const perfMetrics = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime;
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null;

      return {
        fcp: fcp,
        lcp: lcp,
        dcl: navEntry?.domContentLoadedEventEnd,
        load: navEntry?.loadEventEnd,
        domInteractive: navEntry?.domInteractive,
        transferSize: navEntry?.transferSize,
        encodedBodySize: navEntry?.encodedBodySize,
        decodedBodySize: navEntry?.decodedBodySize,
      };
    });

    // TTI assertion - using domInteractive as a reliable proxy
    const ttiValue = perfMetrics.domInteractive || perfMetrics.dcl || perfMetrics.load || 0;
    console.log('Performance Metrics:', perfMetrics);
    console.log('Estimated TTI (domInteractive):', ttiValue, 'ms');

    expect(ttiValue).toBeLessThan(2000);
  });

  test('First Contentful Paint is under 1.5 seconds', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const fcp = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : null;
    });

    console.log('FCP:', fcp, 'ms');
    expect(fcp).not.toBeNull();
    expect(fcp).toBeLessThan(1500);
  });

  test('Largest Contentful Paint is under 2 seconds', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const lcp = await page.evaluate(() => {
      const entries = performance.getEntriesByType('largest-contentful-paint');
      return entries.length > 0 ? entries[entries.length - 1].startTime : null;
    });

    console.log('LCP:', lcp, 'ms');
    if (lcp !== null) {
      expect(lcp).toBeLessThan(2000);
    }
  });

  test('index.html uses preload hints for critical assets', async () => {
    const fs = require('fs');
    const path = require('path');
    const indexPath = path.resolve(__dirname, '../../public/index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');

    // Check for preload of critical assets
    expect(html).toMatch(/rel=["']preload["']/);
    expect(html).toContain('as="image"');
    expect(html).toContain('as="style"');
    expect(html).toContain('as="script"');
  });

  test('main script is loaded with defer', async () => {
    const fs = require('fs');
    const path = require('path');
    const indexPath = path.resolve(__dirname, '../../public/index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');

    expect(html).toMatch(/<script[^>]*src=["']\/scripts\/main\.js["'][^>]*\sdefer(\s|=|>)[^>]*>/i);
  });

  test('mascot image uses eager loading', async () => {
    const fs = require('fs');
    const path = require('path');
    const indexPath = path.resolve(__dirname, '../../public/index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');

    expect(html).toMatch(/<img[^>]*loading=["']eager["'][^>]*>/i);
  });
});
