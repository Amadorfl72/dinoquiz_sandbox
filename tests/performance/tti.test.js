const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TTI_THRESHOLD_MS = 2000;

describe('TRIOFSND-53: Home Screen TTI Performance', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setCache(false);
    // Disable network caching for consistent measurements
    const client = await page.target().createCDPSession();
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  });

  afterEach(async () => {
    if (page) await page.close();
  });

  async function measureTTI() {
    const navigationEntry = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              resolve({
                fcp: entry.startTime,
              });
            }
          }
        }).observe({ type: 'paint', buffered: true });
      });
    });

    // Use Lighthouse TTI calculation approximation via tracing
    const trace = await page.tracing.start({ path: undefined, screenshots: false });
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.tracing.stop();

    const metrics = await page.evaluate(() => {
      const navEntries = performance.getEntriesByType('navigation');
      const navTiming = navEntries[0] || {};
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find((e) => e.name === 'first-contentful-paint');
      const ttiPolyfill = () => {
        return new Promise((resolve) => {
          if (window.__tti && window.__tti.e) {
            resolve(window.__tti.e);
            return;
          }
          // Fallback: approximate TTI as DOMContentLoaded + network idle
          const nav = performance.getEntriesByType('navigation')[0];
          resolve(nav ? nav.domContentLoadedEventEnd : 0);
        });
      };
      return {
        domContentLoaded: navTiming.domContentLoadedEventEnd,
        loadEventEnd: navTiming.loadEventEnd,
        fcp: fcp ? fcp.startTime : 0,
      };
    });

    return metrics;
  }

  test('Home screen TTI should be under 2000ms', async () => {
    // Warm up run (not measured)
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.close();
    page = await browser.newPage();

    // Measured run
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const tti = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Use TTI polyfill if available, otherwise use domContentLoadedEventEnd as proxy
        const nav = performance.getEntriesByType('navigation')[0];
        if (window.__ttiPolyfill) {
          window.__ttiPolyfill((tti) => resolve(tti));
        } else {
          resolve(nav ? nav.domContentLoadedEventEnd : 0);
        }
      });
    });

    expect(tti).toBeLessThan(TTI_THRESHOLD_MS);
  }, 30000);

  test('First Contentful Paint should be under 1500ms', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const fcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              resolve(entry.startTime);
            }
          }
        });
        observer.observe({ type: 'paint', buffered: true });
      });
    });

    expect(fcp).toBeLessThan(1500);
  }, 30000);

  test('No long tasks exceeding 50ms on home screen load', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const longTasks = await page.evaluate(() => {
      return new Promise((resolve) => {
        const tasks = [];
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              tasks.push({ duration: entry.duration, startTime: entry.startTime });
            }
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
        setTimeout(() => resolve(tasks), 3000);
      });
    });

    expect(longTasks.length).toBe(0);
  }, 30000);

  test('Total blocking time should be under 200ms', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const tbt = await page.evaluate(() => {
      return new Promise((resolve) => {
        let totalBlockingTime = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              totalBlockingTime += entry.duration - 50;
            }
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
        setTimeout(() => resolve(totalBlockingTime), 3000);
      });
    });

    expect(tbt).toBeLessThan(200);
  }, 30000);
});
