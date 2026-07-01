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
      window.__fcpTime = 0;
      
      // Capture FCP time
      new PerformanceObserver((list) => {
        const fcpEntry = list.getEntries().find(e => e.name === 'first-contentful-paint');
        if (fcpEntry) {
          window.__fcpTime = fcpEntry.startTime;
        }
      }).observe({ type: 'paint', buffered: true });
      
      // Capture long tasks after FCP
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask' && window.__fcpTime > 0 && entry.startTime >= window.__fcpTime) {
            window.__longTasksAfterFCP.push({
              startTime: entry.startTime,
              duration: entry.duration
            });
          }
        }
      }).observe({ type: 'longtask', buffered: true });
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(1000); // Allow time for performance entries to be recorded

    const longTasksAfterFCP = await page.evaluate(() => window.__longTasksAfterFCP);
    const fcpTime = await page.evaluate(() => window.__fcpTime);
    
    console.log('FCP time:', fcpTime, 'ms');
    console.log('Long tasks after FCP:', longTasksAfterFCP);
    
    // Check that there are no long tasks > 50ms after FCP
    const longRunningTasks = longTasksAfterFCP.filter(task => task.duration > 50);
    expect(longRunningTasks.length).toBe(0);
    await page.close();
  });
});