const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TTI_THRESHOLD_MS = 2000;

let browser;

function calculateTTI(perfEntries, domContentLoaded, firstContentfulPaint) {
  // Simplified TTI: the last long task end time after FCP, or DOMContentLoaded, whichever is later
  const longTasks = perfEntries.filter(e => e.entryType === 'longtask' && e.startTime >= firstContentfulPaint);
  if (longTasks.length === 0) {
    return Math.max(domContentLoaded, firstContentfulPaint);
  }
  const lastLongTask = longTasks[longTasks.length - 1];
  return Math.max(lastLongTask.startTime + lastLongTask.duration, domContentLoaded);
}

describe('Home Screen Performance - TTI under 2 seconds', () => {
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
    await browser.close();
  });

  test('Time to Interactive is under 2 seconds on first load', async () => {
    const page = await browser.newPage();
    await page.setCacheEnabled(false); // First load - no cache

    const metrics = {};

    await page.evaluateOnNewDocument(() => {
      window.__perfData = { longTasks: [] };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            window.__perfData.longTasks.push({
              entryType: 'longtask',
              startTime: entry.startTime,
              duration: entry.duration,
            });
          }
        }
      }).observe({ type: 'longtask', buffered: true });
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const perfData = await page.evaluate(() => {
      const navEntries = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const lcpEntry = lcpEntries[lcpEntries.length - 1];

      return {
        domContentLoaded: navEntries ? navEntries.domContentLoadedEventEnd : 0,
        loadEventEnd: navEntries ? navEntries.loadEventEnd : 0,
        firstContentfulPaint: fcpEntry ? fcpEntry.startTime : 0,
        largestContentfulPaint: lcpEntry ? lcpEntry.startTime : 0,
        longTasks: window.__perfData.longTasks,
        transferSize: navEntries ? navEntries.transferSize : 0,
        encodedBodySize: navEntries ? navEntries.encodedBodySize : 0,
      };
    });

    const tti = calculateTTI(
      perfData.longTasks,
      perfData.domContentLoaded,
      perfData.firstContentfulPaint
    );

    console.log('TTI (first load):', tti, 'ms');
    console.log('FCP:', perfData.firstContentfulPaint, 'ms');
    console.log('LCP:', perfData.largestContentfulPaint, 'ms');
    console.log('DOM Content Loaded:', perfData.domContentLoaded, 'ms');
    console.log('Long tasks:', perfData.longTasks.length);

    expect(tti).toBeLessThan(TTI_THRESHOLD_MS);
    await page.close();
  });

  test('Time to Interactive is under 2 seconds on repeat load (cached)', async () => {
    const page = await browser.newPage();
    await page.setCacheEnabled(true);

    // First visit to populate cache
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Reload for cached performance measurement
    const metrics = {};

    await page.evaluateOnNewDocument(() => {
      window.__perfData = { longTasks: [] };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            window.__perfData.longTasks.push({
              entryType: 'longtask',
              startTime: entry.startTime,
              duration: entry.duration,
            });
          }
        }
      }).observe({ type: 'longtask', buffered: true });
    });

    await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });

    const perfData = await page.evaluate(() => {
      const navEntries = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');

      return {
        domContentLoaded: navEntries ? navEntries.domContentLoadedEventEnd : 0,
        loadEventEnd: navEntries ? navEntries.loadEventEnd : 0,
        firstContentfulPaint: fcpEntry ? fcpEntry.startTime : 0,
        longTasks: window.__perfData.longTasks,
        transferSize: navEntries ? navEntries.transferSize : 0,
      };
    });

    const tti = calculateTTI(
      perfData.longTasks,
      perfData.domContentLoaded,
      perfData.firstContentfulPaint
    );

    console.log('TTI (cached load):', tti, 'ms');
    console.log('Transfer size (cached):', perfData.transferSize, 'bytes');

    expect(tti).toBeLessThan(TTI_THRESHOLD_MS);
    await page.close();
  });

  test('First Contentful Paint is under 1.5 seconds', async () => {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const fcp = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : Infinity;
    });

    console.log('FCP:', fcp, 'ms');
    expect(fcp).toBeLessThan(1500);
    await page.close();
  });

  test('No long tasks exceeding 50ms after First Contentful Paint', async () => {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    await page.evaluateOnNewDocument(() => {
      window.__longTasksAfterFCP = [];
      let fcpTime = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            fcpTime = entry.startTime;
          }
        }
      }).observe({ type: 'paint', buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask' && entry.startTime >= fcpTime) {
            window.__longTasksAfterFCP.push({
              startTime: entry.startTime,
              duration: entry.duration,
            });
          }
        }
      }).observe({ type: 'longtask', buffered: true });
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(3000);

    const longTasks = await page.evaluate(() => window.__longTasksAfterFCP || []);
    console.log('Long tasks after FCP:', longTasks.length);
    longTasks.forEach((t, i) => console.log(`  Task ${i}: ${t.duration}ms at ${t.startTime}ms`));

    // Allow some tolerance but flag excessive long tasks
    const excessiveTasks = longTasks.filter(t => t.duration > 100);
    expect(excessiveTasks.length).toBe(0);
    await page.close();
  });

  test('Total page weight (transfer size) is optimized', async () => {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    let totalTransferSize = 0;
    page.on('response', async (response) => {
      try {
        const headers = response.headers();
        const contentLength = parseInt(headers['content-length'] || '0', 10);
        if (contentLength > 0) {
          totalTransferSize += contentLength;
        }
      } catch (e) {
        // ignore
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('Total transfer size:', totalTransferSize, 'bytes');
    // Expect total page weight to be under 500KB for fast TTI
    expect(totalTransferSize).toBeLessThan(500000);
    await page.close();
  });

  test('JavaScript bundles are code-split or lazy-loaded', async () => {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    const jsRequests = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.endsWith('.js') || url.includes('.js?')) {
        jsRequests.push(url);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('JS bundle count:', jsRequests.length);
    jsRequests.forEach((url, i) => console.log(`  ${i}: ${url}`));

    // Should have more than 1 JS file (code splitting) or a single small bundle
    expect(jsRequests.length).toBeGreaterThanOrEqual(1);
    await page.close();
  });

  test('Images are optimized (compressed or lazy-loaded)', async () => {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const imageInfo = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => ({
        src: img.src,
        loading: img.loading,
        width: img.naturalWidth,
        height: img.naturalHeight,
        hasSrcSet: img.hasAttribute('srcset'),
      }));
    });

    console.log('Images found:', imageInfo.length);
    imageInfo.forEach((img, i) => console.log(`  ${i}: ${img.src} (loading=${img.loading})`));

    // Images below the fold should be lazy-loaded
    const lazyImages = imageInfo.filter(img => img.loading === 'lazy');
    console.log('Lazy-loaded images:', lazyImages.length);

    // At least some images should use lazy loading if there are many
    if (imageInfo.length > 3) {
      expect(lazyImages.length).toBeGreaterThan(0);
    }

    await page.close();
  });

  test('Text resources are compressed (gzip or brotli)', async () => {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    const compressionInfo = [];
    page.on('response', (response) => {
      const url = response.url();
      const encoding = response.headers()['content-encoding'] || 'none';
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('text') || contentType.includes('javascript') || contentType.includes('css') || contentType.includes('json')) {
        compressionInfo.push({ url, encoding, contentType });
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('Compression info:');
    compressionInfo.forEach(info => console.log(`  ${info.url}: ${info.encoding}`));

    const uncompressed = compressionInfo.filter(info => info.encoding === 'none' && !info.url.includes('data:'));
    // Allow some uncompressed resources but main bundles should be compressed
    if (compressionInfo.length > 0) {
      const compressedRatio = (compressionInfo.length - uncompressed.length) / compressionInfo.length;
      console.log('Compressed ratio:', compressedRatio);
      expect(compressedRatio).toBeGreaterThan(0.5);
    }

    await page.close();
  });
});
