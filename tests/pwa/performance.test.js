const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TTI_THRESHOLD_MS = 2000;

describe('PWA Performance - Time to Interactive', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  test('home screen TTI is under 2 seconds', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const metrics = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).then(async () => {
      // Measure TTI using the first input delay readiness approximation
      // TTI is approximated as the time when the main thread is idle
      // after FCP and the page has been interactive for 5 seconds
      const perfData = await page.evaluate(() => {
        return new Promise((resolve) => {
          const navTiming = performance.getEntriesByType('navigation')[0];
          const paintEntries = performance.getEntriesByType('paint');
          const fcp = paintEntries.find((e) => e.name === 'first-contentful-paint');

          // Use PerformanceObserver for TTI approximation
          let longestTask = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > longestTask) {
                longestTask = entry.duration;
              }
            }
          });
          observer.observe({ entryTypes: ['longtask'] });

          // Wait for network idle and main thread quiet
          setTimeout(() => {
            const tti = fcp ? fcp.startTime + longestTask : navTiming.domComplete;
            resolve({
              domContentLoaded: navTiming.domContentLoadedEventEnd,
              loadEventEnd: navTiming.loadEventEnd,
              domComplete: navTiming.domComplete,
              fcp: fcp ? fcp.startTime : null,
              longestTask,
              ttiApproximation: tti,
            });
          }, 3000);
        });
      });

      return perfData;
    });

    expect(metrics).toBeDefined();
    expect(metrics.ttiApproximation).toBeLessThan(TTI_THRESHOLD_MS);

    await context.close();
  });

  test('First Contentful Paint is under 1.8 seconds', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const fcp = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find((e) => e.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : null;
    });

    expect(fcp).not.toBeNull();
    expect(fcp).toBeLessThan(1800);

    await context.close();
  });

  test('no render-blocking resources on home page', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const blockingResources = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.css') || url.includes('.js')) {
        blockingResources.push({ url, status: response.status() });
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Check that scripts are deferred or async
    const scriptAttributes = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts.map((s) => ({
        src: s.src,
        defer: s.defer,
        async: s.async,
        type: s.type,
      }));
    });

    const renderBlockingScripts = scriptAttributes.filter(
      (s) => !s.defer && !s.async && s.type !== 'module'
    );

    expect(renderBlockingScripts.length).toBe(0);

    await context.close();
  });

  test('images are lazy loaded or optimized', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const images = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map((img) => ({
        src: img.src,
        loading: img.loading,
        width: img.width,
        height: img.height,
      }));
    });

    // Images below the fold should be lazy loaded
    const nonLazyImages = images.filter((img) => !img.loading || img.loading !== 'lazy');

    // Allow hero images to be eager, but most should be lazy
    if (images.length > 3) {
      expect(nonLazyImages.length).toBeLessThan(images.length);
    }

    await context.close();
  });

  test('assets are served with compression', async () => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Encoding': 'gzip, deflate, br' },
    });
    const page = await context.newPage();

    let hasCompressedResponse = false;

    page.on('response', (response) => {
      const encoding = response.headers()['content-encoding'];
      if (encoding && ['gzip', 'deflate', 'br'].includes(encoding)) {
        hasCompressedResponse = true;
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    expect(hasCompressedResponse).toBe(true);

    await context.close();
  });

  test('assets have cache-control headers', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    let hasCacheHeaders = false;

    page.on('response', (response) => {
      const cacheControl = response.headers()['cache-control'];
      if (cacheControl) {
        hasCacheHeaders = true;
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    expect(hasCacheHeaders).toBe(true);

    await context.close();
  });

  test('repeated load is faster due to caching (TTI under 1 second on second visit)', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // First load - populate cache
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForTimeout(2000);

    // Second load - should be faster
    const page2 = await context.newPage();
    const metrics = await page2.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).then(async () => {
      const perfData = await page2.evaluate(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const navTiming = performance.getEntriesByType('navigation')[0];
            resolve({
              domContentLoaded: navTiming.domContentLoadedEventEnd,
              domComplete: navTiming.domComplete,
              transferSize: navTiming.transferSize,
              decodedBodySize: navTiming.decodedBodySize,
            });
          }, 2000);
        });
      });
      return perfData;
    });

    expect(metrics.domComplete).toBeLessThan(1000);
    // Transfer size should be small if served from cache
    expect(metrics.transferSize).toBeLessThan(50000);

    await context.close();
  });
});
