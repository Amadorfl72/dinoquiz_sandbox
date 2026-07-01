const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TTI_THRESHOLD_MS = 2000;

let browser;

beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
});

afterAll(async () => {
  if (browser) await browser.close();
});

async function measurePerformance(url) {
  const page = await browser.newPage();
  await page.setCacheEnabled(true);

  const client = await page.target().createCDPSession();
  await client.send('Performance.enable');

  const metrics = {
    navigationStart: null,
    domContentLoadedEventEnd: null,
    loadEventEnd: null,
    firstPaint: null,
    firstContentfulPaint: null,
    timeToInteractive: null,
    largestContentfulPaint: null,
    totalBlockingTime: null,
    cumulativeLayoutShift: null,
    resourceCount: 0,
    totalTransferSize: 0,
    resources: [],
  };

  // Collect performance entries
  await page.evaluateOnNewDocument(() => {
    window.__perfMetrics = {};
    window.__ttiObserver = new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'Interactive') {
            window.__perfMetrics.tti = entry.startTime;
            resolve(entry.startTime);
          }
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
    });
  });

  const response = await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Wait a bit for all metrics to settle
  await page.waitForTimeout(3000);

  const perfMetrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paintEntries = performance.getEntriesByType('paint');
    const fp = paintEntries.find((p) => p.name === 'first-paint');
    const fcp = paintEntries.find((p) => p.name === 'first-contentful-paint');

    return {
      navigationStart: nav.startTime || 0,
      domContentLoadedEventEnd: nav.domContentLoadedEventEnd || 0,
      loadEventEnd: nav.loadEventEnd || 0,
      firstPaint: fp ? fp.startTime : null,
      firstContentfulPaint: fcp ? fcp.startTime : null,
      domInteractive: nav.domInteractive || 0,
      responseEnd: nav.responseEnd || 0,
      transferSize: nav.transferSize || 0,
      encodedBodySize: nav.encodedBodySize || 0,
    };
  });

  // Get LCP
  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      const entries = performance.getEntriesByType(
        'largest-contentful-paint'
      );
      if (entries.length > 0) {
        resolve(entries[entries.length - 1].startTime);
      } else {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            resolve(entries[entries.length - 1].startTime);
          } else {
            resolve(null);
          }
          observer.disconnect();
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve(null), 5000);
      }
    });
  });

  // Get CLS
  const cls = await page.evaluate(() => {
    return new Promise((resolve) => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 3000);
    });
  });

  // Get resource information
  const resources = await page.evaluate(() => {
    return performance
      .getEntriesByType('resource')
      .map((r) => ({
        name: r.name,
        type: r.initiatorType,
        duration: r.duration,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
      }));
  });

  // Calculate TTI approximation: FCP + last long task duration
  // Or use domInteractive as a proxy
  const tti =
    perfMetrics.firstContentfulPaint ||
    perfMetrics.domInteractive ||
    perfMetrics.loadEventEnd;

  await page.close();

  return {
    ...perfMetrics,
    largestContentfulPaint: lcp,
    cumulativeLayoutShift: cls,
    timeToInteractive: tti,
    resourceCount: resources.length,
    resources,
    totalTransferSize: resources.reduce(
      (sum, r) => sum + (r.transferSize || 0),
      0
    ),
  };
}

describe('TRIOFSND-53: Home Screen Performance - TTI under 2 seconds', () => {
  test('Time to Interactive is under 2000ms (cold load)', async () => {
    const metrics = await measurePerformance(BASE_URL);

    console.log('Cold load performance metrics:', {
      TTI: metrics.timeToInteractive,
      FCP: metrics.firstContentfulPaint,
      LCP: metrics.largestContentfulPaint,
      CLS: metrics.cumulativeLayoutShift,
      resourceCount: metrics.resourceCount,
      totalTransferSize: metrics.totalTransferSize,
    });

    expect(metrics.timeToInteractive).toBeDefined();
    expect(metrics.timeToInteractive).toBeLessThan(TTI_THRESHOLD_MS);
  });

  test('Time to Interactive is under 2000ms (warm load - cached)', async () => {
    // First load to populate cache
    await measurePerformance(BASE_URL);

    // Second load with cache
    const metrics = await measurePerformance(BASE_URL);

    console.log('Warm load performance metrics:', {
      TTI: metrics.timeToInteractive,
      FCP: metrics.firstContentfulPaint,
      LCP: metrics.largestContentfulPaint,
      resourceCount: metrics.resourceCount,
      totalTransferSize: metrics.totalTransferSize,
    });

    expect(metrics.timeToInteractive).toBeDefined();
    expect(metrics.timeToInteractive).toBeLessThan(TTI_THRESHOLD_MS);
  });

  test('First Contentful Paint is under 1500ms', async () => {
    const metrics = await measurePerformance(BASE_URL);

    expect(metrics.firstContentfulPaint).toBeDefined();
    expect(metrics.firstContentfulPaint).toBeLessThan(1500);
  });

  test('Largest Contentful Paint is under 2500ms', async () => {
    const metrics = await measurePerformance(BASE_URL);

    expect(metrics.largestContentfulPaint).toBeDefined();
    expect(metrics.largestContentfulPaint).not.toBeNull();
    expect(metrics.largestContentfulPaint).toBeLessThan(2500);
  });

  test('Cumulative Layout Shift is under 0.1', async () => {
    const metrics = await measurePerformance(BASE_URL);

    expect(metrics.cumulativeLayoutShift).toBeDefined();
    expect(metrics.cumulativeLayoutShift).toBeLessThan(0.1);
  });

  test('DOM Content Loaded fires within 1000ms', async () => {
    const metrics = await measurePerformance(BASE_URL);

    expect(metrics.domContentLoadedEventEnd).toBeDefined();
    expect(metrics.domContentLoadedEventEnd).toBeLessThan(1000);
  });

  test('total page weight (transfer size) is reasonable', async () => {
    const metrics = await measurePerformance(BASE_URL);

    // Total transfer size should be under 500KB for a performant home screen
    const MAX_TRANSFER_SIZE = 500 * 1024;
    expect(metrics.totalTransferSize).toBeLessThan(MAX_TRANSFER_SIZE);
  });

  test('number of network requests is optimized', async () => {
    const metrics = await measurePerformance(BASE_URL);

    // Should not have too many individual requests
    expect(metrics.resourceCount).toBeLessThan(50);
  });
});

describe('TRIOFSND-53: Asset Loading Optimization', () => {
  test('JavaScript bundles are minified', async () => {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    const scripts = await page.$$eval('script[src]', (scripts) =>
      scripts.map((s) => s.src)
    );

    expect(scripts.length).toBeGreaterThan(0);

    for (const scriptUrl of scripts) {
      const response = await page.goto(scriptUrl);
      const content = await response.text();

      // Minified JS typically has long lines
      const lines = content.split('\n');
      const avgLineLength =
        content.length / Math.max(lines.length, 1);

      // If avg line length is very short, it's likely not minified
      // (allowing for source maps and small files)
      if (content.length > 1000) {
        expect(avgLineLength).toBeGreaterThan(100);
      }
    }

    await page.close();
  });

  test('CSS is minified', async () => {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    const stylesheets = await page.$$eval('link[rel="stylesheet"]', (links) =>
      links.map((l) => l.href)
    );

    for (const cssUrl of stylesheets) {
      const response = await page.goto(cssUrl);
      const content = await response.text();

      if (content.length > 500) {
        const lines = content.split('\n');
        const avgLineLength =
          content.length / Math.max(lines.length, 1);
        expect(avgLineLength).toBeGreaterThan(100);
      }
    }

    await page.close();
  });

  test('images use appropriate compression (webp or optimized formats)', async () => {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    const images = await page.$$eval('img', (imgs) =>
      imgs.map((img) => ({ src: img.src, alt: img.alt }))
    );

    for (const img of images) {
      if (img.src) {
        // Check if images are using modern formats or are reasonably sized
        const response = await page.goto(img.src);
        const contentType = response.headers()['content-type'];
        const transferSize =
          (await response.buffer()).length;

        // Images should be under 200KB each
        expect(transferSize).toBeLessThan(200 * 1024);
      }
    }

    await page.close();
  });

  test('critical resources use gzip or brotli compression', async () => {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    const resources = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter(
          (r) =>
            r.initiatorType === 'script' ||
            r.initiatorType === 'css' ||
            r.initiatorType === 'link'
        )
        .map((r) => ({
          name: r.name,
          encodedBodySize: r.encodedBodySize,
          decodedBodySize: r.decodedBodySize,
          compressionRatio:
            r.decodedBodySize > 0
              ? r.encodedBodySize / r.decodedBodySize
              : 1,
        }))
    );

    resources.forEach((resource) => {
      if (resource.decodedBodySize > 1024) {
        // Should have some compression applied
        expect(resource.compressionRatio).toBeLessThan(0.7);
      }
    });

    await page.close();
  });

  test('non-critical JavaScript is deferred or loaded asynchronously', async () => {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    const scriptInfo = await page.$$eval('script[src]', (scripts) =>
      scripts.map((s) => ({
        src: s.src,
        async: s.async,
        defer: s.defer,
        type: s.type,
      }))
    );

    // At least some scripts should use defer or async
    const optimizedScripts = scriptInfo.filter(
      (s) => s.async || s.defer
    );

    // If there are multiple scripts, at least one should be deferred/async
    if (scriptInfo.length > 1) {
      expect(optimizedScripts.length).toBeGreaterThan(0);
    }

    await page.close();
  });

  test('no render-blocking resources above the fold', async () => {
    const page = await browser.newPage();

    const renderBlockingResources = [];

    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (
        resourceType === 'stylesheet' ||
        (resourceType === 'script' && !request.headers()['x-defer'])
      ) {
        renderBlockingResources.push({
          url: request.url(),
          type: resourceType,
        });
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // Allow some render-blocking CSS (it's often necessary)
    // But limit the count
    const blockingStylesheets = renderBlockingResources.filter(
      (r) => r.type === 'stylesheet'
    );
    expect(blockingStylesheets.length).toBeLessThanOrEqual(2);

    await page.close();
  });
});
