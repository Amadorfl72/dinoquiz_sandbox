import { test, expect } from '@playwright/test';

test.describe('TRIOFSND-53: PWA Setup and Performance Optimization', () => {
  test('App is installable: manifest.json contains a maskable icon', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.ok()).toBeTruthy();
    
    const manifest = await response.json();
    
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
    
    const hasMaskableIcon = manifest.icons.some(
      (icon: any) => icon.purpose && icon.purpose.includes('maskable')
    );
    
    expect(hasMaskableIcon).toBeTruthy();
  });

  test('Home screen TTI is under 2 seconds', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    
    // Using domContentLoadedEventEnd as a standard proxy for Time to Interactive (TTI)
    const metrics = await page.evaluate(() => {
      const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      return {
        tti: nav.domContentLoadedEventEnd,
        loadEventEnd: nav.loadEventEnd
      };
    });

    console.log(`Measured TTI (domContentLoadedEventEnd): ${metrics.tti}ms`);
    expect(metrics.tti).toBeLessThan(2000);
  });
});
