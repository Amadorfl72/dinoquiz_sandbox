const { test, expect } = require('@playwright/test');

test.describe('Home Screen Performance', () => {
  test('TTI should be under 2000ms', async ({ page }) => {
    // Navigate to the home screen
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    
    // Wait for network to be idle to ensure interactivity
    await page.waitForLoadState('networkidle');

    // Measure Time to Interactive (approximated by domInteractive)
    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        tti: timing.domInteractive - timing.navigationStart,
        loadEventEnd: timing.loadEventEnd - timing.navigationStart
      };
    });

    console.log(`Measured TTI (domInteractive): ${metrics.tti}ms`);
    console.log(`Measured Load Event End: ${metrics.loadEventEnd}ms`);

    expect(metrics.tti).toBeLessThan(2000);
  });
});