const { test, expect } = require('@playwright/test');

test.describe('Performance Optimization', () => {
  test('Time to Interactive (TTI) should be under 2 seconds', async ({ page }) => {
    await page.goto('/');
    
    // Using Performance Timing API to estimate TTI (loadEventEnd - navigationStart)
    // Note: True TTI is complex, but loadEventEnd is a good proxy for these tests.
    const timing = await page.evaluate(() => {
      const { navigationStart, loadEventEnd, domContentLoadedEventEnd } = window.performance.timing;
      return {
        loadTime: loadEventEnd - navigationStart,
        domContentLoadedTime: domContentLoadedEventEnd - navigationStart
      };
    });

    // TTI is often correlated with DOMContentLoaded or Load event.
    // We assert that the load time is under 2000ms.
    expect(timing.loadTime).toBeLessThan(2000);
  });
});