import { test, expect } from '@playwright/test';

test.describe('TRIOFSND-53: PWA Setup and Performance Optimization', () => {
  test('PWA Manifest is configured correctly for installability', async ({ page }) => {
    await page.goto('/');
    
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', /.+\.webmanifest|manifest\.json/);
    
    const href = await manifestLink.getAttribute('href');
    const response = await page.goto(href);
    const manifest = await response.json();

    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.icons[0].src).toBeDefined();
    expect(manifest.icons[0].sizes).toBeDefined();
    expect(manifest.icons[0].type).toBeDefined();
  });

  test('Service Worker is registered and provides offline support', async ({ page, context }) => {
    await page.goto('/');
    
    // Wait for service worker to register and become active
    await page.waitForFunction(() => navigator.serviceWorker.ready);
    
    // Go offline
    await context.setOffline(true);
    
    // Reload page to test offline caching
    await page.reload();
    
    // Check if the page loaded successfully offline
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
  });

  test('Home screen performance is optimized (TTI < 2s)', async ({ page }) => {
    // Capture Largest Contentful Paint (LCP) as a proxy for Time to Interactive (TTI)
    const lcpPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const lcp = await lcpPromise;
    
    // TTI / LCP should be under 2 seconds (2000ms)
    expect(lcp).toBeLessThan(2000);
  });
});
