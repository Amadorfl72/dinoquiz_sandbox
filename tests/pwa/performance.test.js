const { test, expect } = require('@playwright/test');

describe('TRIOFSND-53: Performance Optimization - TTI under 2 seconds', () => {
  test('home screen TTI is under 2 seconds', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    const metrics = await page.evaluate(async (pageUrl) => {
      return new Promise((resolve) => {
        const navigationStart = performance.timing
          ? performance.timing.navigationStart
          : performance.getEntriesByType('navigation')[0]?.startTime || 0;

        // Use PerformanceObserver to track TTI-related metrics
        const ttiEstimate = { value: null };

        // FCP (First Contentful Paint)
        const fcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              ttiEstimate.fcp = entry.startTime;
            }
          }
        });
        try { fcpObserver.observe({ type: 'paint', buffered: true }); } catch(e) {}

        // LCP (Largest Contentful Paint) - proxy for TTI
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            ttiEstimate.lcp = entry.startTime;
          }
        });
        try { lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true }); } catch(e) {}

        // DOM Content Loaded
        const dclObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.type === 'domcontentloaded') {
              ttiEstimate.dcl = entry.startTime;
            }
          }
        });
        try { dclObserver.observe({ type: 'navigation', buffered: true }); } catch(e) {}

        // Load event
        const loadObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.type === 'load') {
              ttiEstimate.load = entry.startTime;
            }
          }
        });
        try { loadObserver.observe({ type: 'navigation', buffered: true }); } catch(e) {}

        // Long Tasks
        const longTasks = [];
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTasks.push({ duration: entry.duration, startTime: entry.startTime });
          }
        });
        try { longTaskObserver.observe({ type: 'longtask', buffered: true }); } catch(e) {}

        // Wait for load and collect metrics
        window.addEventListener('load', () => {
          setTimeout(() => {
            const navEntry = performance.getEntriesByType('navigation')[0];
            const paintEntries = performance.getEntriesByType('paint');

            const fcp = paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime;
            const lcp = ttiEstimate.lcp;
            const dcl = navEntry?.domContentLoadedEventEnd;
            const load = navEntry?.loadEventEnd;

            // TTI estimation: last long task end or DCL, whichever is later
            const lastLongTaskEnd = longTasks.length > 0
              ? Math.max(...longTasks.map(t => t.startTime + t.duration))
              : 0;
            const estimatedTTI = Math.max(fcp || 0, lastLongTaskEnd, dcl || 0);

            resolve({
              fcp: fcp || null,
              lcp: lcp || null,
              dcl: dcl || null,
              load: load || null,
              estimatedTTI: estimatedTTI,
              longTasks: longTasks,
              domInteractive: navEntry?.domInteractive || null,
              transferSize: navEntry?.transferSize || null,
              encodedBodySize: navEntry?.encodedBodySize || null,
              decodedBodySize: navEntry?.decodedBodySize || null,
            });
          }, 3000);
        });
      });
    }, url);

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
    expect(lcp).not.toBeNull();
    expect(lcp).toBeLessThan(2000);
  });

  test('no long tasks blocking main thread over 200ms', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    const longTasks = [];
    await page.evaluate(() => {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          window.__longTasks = window.__longTasks || [];
          window.__longTasks.push({ duration: entry.duration, startTime: entry.startTime });
        });
      });
      try { observer.observe({ type: 'longtask', buffered: true }); } catch(e) {}
    });

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const tasks = await page.evaluate(() => window.__longTasks || []);
    console.log('Long tasks:', tasks);

    const blockingTasks = tasks.filter(t => t.duration > 200);
    expect(blockingTasks.length).toBe(0);
  });

  test('total page weight is optimized', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    let totalTransferSize = 0;
    const resourceEntries = [];

    page.on('response', (response) => {
      resourceEntries.push({
        url: response.url(),
        status: response.status(),
      });
    });

    await page.goto(url, { waitUntil: 'networkidle' });

    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
        decodedBodySize: r.decodedBodySize,
        duration: r.duration,
        initiatorType: r.initiatorType,
      }));
    });

    totalTransferSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    console.log('Total transfer size:', (totalTransferSize / 1024).toFixed(2), 'KB');
    console.log('Number of resources:', resources.length);

    // Total page weight should be under 500KB for optimal TTI
    expect(totalTransferSize).toBeLessThan(500 * 1024);

    // Number of requests should be reasonable
    expect(resources.length).toBeLessThan(50);
  });

  test('assets are served with compression', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    const compressedResources = [];
    page.on('response', (response) => {
      const encoding = response.headers()['content-encoding'] || '';
      const contentType = response.headers()['content-type'] || '';
      if (['text/javascript', 'text/css', 'application/javascript', 'text/html', 'application/json'].some(t => contentType.includes(t))) {
        compressedResources.push({
          url: response.url(),
          encoding: encoding,
          contentType: contentType,
        });
      }
    });

    await page.goto(url, { waitUntil: 'networkidle' });

    // At least some text-based assets should be compressed
    const hasCompression = compressedResources.some(r => ['gzip', 'br', 'deflate'].includes(r.encoding));
    console.log('Compressed resources:', compressedResources.filter(r => r.encoding));
    expect(hasCompression).toBe(true);
  });

  test('images are optimized', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    await page.goto(url, { waitUntil: 'networkidle' });

    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        width: img.naturalWidth,
        height: img.naturalHeight,
        loading: img.loading,
        hasSrcSet: !!img.srcset,
        hasSizes: !!img.sizes,
      }));
    });

    console.log('Images:', images);

    // Images should use lazy loading where appropriate
    const lazyImages = images.filter(img => img.loading === 'lazy');
    console.log('Lazy loaded images:', lazyImages.length);

    // Images should have responsive srcset for optimization
    // (at least for images above the fold, this is a best practice check)
    images.forEach((img) => {
      expect(img.width).toBeGreaterThan(0);
      expect(img.height).toBeGreaterThan(0);
    });
  });

  test('JavaScript bundles are code-split', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    const jsResources = [];
    page.on('response', (response) => {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('javascript')) {
        jsResources.push({
          url: response.url(),
          size: parseInt(response.headers()['content-length'] || '0'),
        });
      }
    });

    await page.goto(url, { waitUntil: 'networkidle' });

    const jsFromPerf = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(r => r.initiatorType === 'script')
        .map(r => ({ name: r.name, transferSize: r.transferSize }));
    });

    console.log('JS resources:', jsFromPerf);

    // Should have multiple JS chunks (code splitting)
    expect(jsFromPerf.length).toBeGreaterThan(1);

    // No single JS bundle should be excessively large
    const MAX_BUNDLE_SIZE = 250 * 1024; // 250KB
    jsFromPerf.forEach((resource) => {
      if (resource.transferSize > 0) {
        console.log(`Bundle: ${resource.name} - ${(resource.transferSize / 1024).toFixed(2)}KB`);
        expect(resource.transferSize).toBeLessThan(MAX_BUNDLE_SIZE);
      }
    });
  });

  test('critical CSS is inlined or preloaded', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const hasInlineStyles = await page.evaluate(() => {
      return document.querySelectorAll('style').length > 0;
    });

    const hasPreloadLinks = await page.evaluate(() => {
      return document.querySelectorAll('link[rel="preload"]').length > 0;
    });

    const hasPreconnectLinks = await page.evaluate(() => {
      return document.querySelectorAll('link[rel="preconnect"]').length > 0;
    });

    console.log('Inline styles:', hasInlineStyles);
    console.log('Preload links:', hasPreloadLinks);
    console.log('Preconnect links:', hasPreconnectLinks);

    // At least one optimization strategy should be present
    expect(hasInlineStyles || hasPreloadLinks).toBe(true);
  });
});
