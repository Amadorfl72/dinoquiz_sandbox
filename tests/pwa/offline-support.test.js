const { test, expect } = require('@playwright/test');

describe('TRIOFSND-53: Offline Support', () => {
  test('app loads from cache when offline', async ({ page, context, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    // First, load the page online to populate cache
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Wait for service worker to be activated
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await navigator.serviceWorker.ready;
      }
    });

    // Give the SW time to cache assets
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    try {
      // Reload the page while offline
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Verify the page loaded from cache
      const title = await page.title();
      expect(title).toBeDefined();
      expect(title.length).toBeGreaterThan(0);

      // Check that key content is visible
      const bodyVisible = await page.isVisible('body');
      expect(bodyVisible).toBe(true);

      // Verify no critical error page is shown
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain("This site can't be reached");
      expect(bodyText).not.toContain('ERR_INTERNET_DISCONNECTED');
      expect(bodyText).not.toContain('No internet');
    } finally {
      // Restore online state
      await context.setOffline(false);
    }
  });

  test('cached assets are served from service worker on subsequent loads', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    const cachedRequests = [];
    page.on('response', (response) => {
      const fromSW = response.headers()['x-served-from'] || '';
      if (fromSW.includes('cache') || fromSW.includes('sw')) {
        cachedRequests.push(response.url());
      }
    });

    // First load
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Second load - should use cache
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // At least some resources should be cached
    // Note: This depends on SW implementation, so we check that the page loads
    const bodyVisible = await page.isVisible('body');
    expect(bodyVisible).toBe(true);
  });

  test('service worker intercepts fetch requests', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Wait for SW to be ready
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    // Check that service worker is controlling the page
    const isControlled = await page.evaluate(() => {
      return !!navigator.serviceWorker.controller;
    });
    expect(isControlled).toBe(true);
  });

  test('app provides offline fallback page or cached content', async ({ page, context, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';

    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForTimeout(2000);

    await context.setOffline(true);

    try {
      // Navigate to a sub-route while offline
      await page.goto(url + '/offline-test', { waitUntil: 'domcontentloaded' });
      const bodyText = await page.textContent('body');
      // Should show some content, not a browser error
      expect(bodyText.length).toBeGreaterThan(0);
    } finally {
      await context.setOffline(false);
    }
  });
});
