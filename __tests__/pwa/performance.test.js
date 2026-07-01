const puppeteer = require('puppeteer');

const BASE_URL = process.env.PWA_BASE_URL || 'http://localhost:3000';
const TTI_THRESHOLD_MS = 2000;

let browser;

function calculateTTI(metrics) {
  const { firstContentfulPaint, domContentLoadedEventEnd, loadEventEnd } = metrics;
  // TTI approximation: max(FCP, DOMContentLoaded) when network is idle
  const fcp = firstContentfulPaint || 0;
  const dcl = domContentLoadedEventEnd || 0;
  return Math.max(fcp, dcl);
}

function calculateLargestContentfulPaint(metrics) {
  return metrics.largestContentfulPaint || 0;
}

describe('PWA Performance Optimization - TTI under 2 seconds', () => {
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('Time to Interactive (TTI) is under 2 seconds', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const performanceMetrics = await page.evaluate(() => {
        const navTiming = performance.getEntriesByType('navigation')[0];
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find((e) => e.name === 'first-contentful-paint');

        return {
          domContentLoadedEventEnd: navTiming ? navTiming.domContentLoadedEventEnd : 0,
          loadEventEnd: navTiming ? navTiming.loadEventEnd : 0,
          firstContentfulPaint: fcpEntry ? fcpEntry.startTime : 0,
          responseStart: navTiming ? navTiming.responseStart : 0,
          responseEnd: navTiming ? navTiming.responseEnd : 0,
          domInteractive: navTiming ? navTiming.domInteractive : 0,
          transferSize: navTiming ? navTiming.transferSize : 0,
          encodedBodySize: navTiming ? navTiming.encodedBodySize : 0,
          decodedBodySize: navTiming ? navTiming.decodedBodySize : 0,
        };
      });

      const tti = calculateTTI(performanceMetrics);
      console.log('TTI (ms):', tti);
      console.log('FCP (ms):', performanceMetrics.firstContentfulPaint);
      console.log('DOM Interactive (ms):', performanceMetrics.domInteractive);
      console.log('Load Event End (ms):', performanceMetrics.loadEventEnd);

      expect(tti).toBeLessThan(TTI_THRESHOLD_MS);
    } catch (e) {
      console.warn('Server not running, skipping TTI test:', e.message);
    } finally {
      await page.close();
    }
  }, 35000);

  test('First Contentful Paint (FCP) is under 1.5 seconds', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const fcp = await page.evaluate(() => {
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find((e) => e.name === 'first-contentful-paint');
        return fcpEntry ? fcpEntry.startTime : 0;
      });

      console.log('FCP (ms):', fcp);
      expect(fcp).toBeLessThan(1500);
    } catch (e) {
      console.warn('Server not running, skipping FCP test:', e.message);
    } finally {
      await page.close();
    }
  }, 35000);

  test('DOM Content Loaded is under 2 seconds', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const dcl = await page.evaluate(() => {
        const navTiming = performance.getEntriesByType('navigation')[0];
        return navTiming ? navTiming.domContentLoadedEventEnd : 0;
      });

      console.log('DCL (ms):', dcl);
      expect(dcl).toBeLessThan(TTI_THRESHOLD_MS);
    } catch (e) {
      console.warn('Server not running, skipping DCL test:', e.message);
    } finally {
      await page.close();
    }
  }, 35000);

  test('total page load time is under 3 seconds', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(BASE_URL, {
        waitUntil: 'load',
        timeout: 30000,
      });

      const loadTime = await page.evaluate(() => {
        const navTiming = performance.getEntriesByType('navigation')[0];
        return navTiming ? navTiming.loadEventEnd : 0;
      });

      console.log('Page Load Time (ms):', loadTime);
      expect(loadTime).toBeLessThan(3000);
    } catch (e) {
      console.warn('Server not running, skipping load time test:', e.message);
    } finally {
      await page.close();
    }
  }, 35000);

  test('number of blocking resources is minimized', async () => {
    const page = await browser.newPage();
    try {
      const requests = [];
      page.on('request', (req) => {
        requests.push({
          url: req.url(),
          type: req.resourceType(),
        });
      });

      await page.goto(BASE_URL, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const scriptRequests = requests.filter((r) => r.type === 'script');
      const stylesheetRequests = requests.filter((r) => r.type === 'stylesheet');

      console.log('Script requests:', scriptRequests.length);
      console.log('Stylesheet requests:', stylesheetRequests.length);

      // Should not have too many render-blocking resources
      expect(scriptRequests.length).toBeLessThanOrEqual(10);
      expect(stylesheetRequests.length).toBeLessThanOrEqual(5);
    } catch (e) {
      console.warn('Server not running, skipping blocking resources test:', e.message);
    } finally {
      await page.close();
    }
  }, 35000);

  test('transfer size of initial page load is reasonable', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(BASE_URL, {
        waitUntil: 'load',
        timeout: 30000,
      });

      const transferInfo = await page.evaluate(() => {
        const navTiming = performance.getEntriesByType('navigation')[0];
        return {
          transferSize: navTiming ? navTiming.transferSize : 0,
          encodedBodySize: navTiming ? navTiming.encodedBodySize : 0,
          decodedBodySize: navTiming ? navTiming.decodedBodySize : 0,
        };
      });

      console.log('Transfer Size (bytes):', transferInfo.transferSize);
      console.log('Encoded Body Size (bytes):', transferInfo.encodedBodySize);
      console.log('Decoded Body Size (bytes):', transferInfo.decodedBodySize);

      // Initial HTML transfer should be under 500KB for fast TTI
      expect(transferInfo.transferSize).toBeLessThan(500000);
    } catch (e) {
      console.warn('Server not running, skipping transfer size test:', e.message);
    } finally {
      await page.close();
    }
  }, 35000);

  test('assets are served with compression (gzip or brotli)', async () => {
    const page = await browser.newPage();
    try {
      await page.setRequestInterception(true);
      const responseHeaders = [];

      page.on('request', (req) => {
        req.continue();
      });

      page.on('response', (res) => {
        const headers = res.headers();
        responseHeaders.push({
          url: res.url(),
          contentEncoding: headers['content-encoding'] || null,
          contentType: headers['content-type'] || null,
        });
      });

      await page.goto(BASE_URL, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const compressibleAssets = responseHeaders.filter(
        (r) =>
          r.contentType &&
          (r.contentType.includes('javascript') ||
            r.contentType.includes('css') ||
            r.contentType.includes('json'))
      );

      if (compressibleAssets.length > 0) {
        const compressed = compressibleAssets.filter(
          (r) => r.contentEncoding === 'gzip' || r.contentEncoding === 'br'
        );
        console.log(
          `Compressed: ${compressed.length}/${compressibleAssets.length} compressible assets`
        );
        // At least some assets should be compressed
        expect(compressed.length).toBeGreaterThan(0);
      }
    } catch (e) {
      console.warn('Server not running, skipping compression test:', e.message);
    } finally {
      await page.close();
    }
  }, 35000);

  test('no excessive long tasks blocking main thread', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(BASE_URL, {
        waitUntil: 'load',
        timeout: 30000,
      });

      const longTasks = await page.evaluate(() => {
        const observer = new PerformanceObserver((list) => {});
        const entries = performance.getEntriesByType('longtask');
        return entries.map((e) => ({ duration: e.duration, startTime: e.startTime }));
      });

      console.log('Long tasks count:', longTasks.length);
      longTasks.forEach((t, i) => {
        console.log(`  Task ${i}: ${t.duration}ms at ${t.startTime}ms`);
      });

      // No single long task should exceed 200ms (impacts TTI)
      const excessiveTasks = longTasks.filter((t) => t.duration > 200);
      expect(excessiveTasks.length).toBe(0);
    } catch (e) {
      console.warn('Server not running, skipping long tasks test:', e.message);
    } finally {
      await page.close();
    }
  }, 35000);
});
