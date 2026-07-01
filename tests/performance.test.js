const { test, expect } = require('@playwright/test');

test('Home screen TTI is under 2 seconds', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  const tti = await page.evaluate(() => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          resolve(entries[0].startTime);
          observer.disconnect();
        }
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Fallback to domComplete if LCP is not available
      setTimeout(() => {
        const navTiming = performance.getEntriesByType('navigation')[0];
        resolve(navTiming ? navTiming.domComplete - navTiming.startTime : 0);
      }, 5000);
    });
  });

  expect(tti).toBeLessThan(2000);
});
