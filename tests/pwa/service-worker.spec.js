const { test, expect } = require('@playwright/test');

test.describe('Service Worker and Offline Support', () => {
  test('should register a service worker', async ({ page }) => {
    await page.goto('/');
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.ready;
      return !!registration;
    });
    expect(swRegistered).toBeTruthy();
  });

  test('should load home screen offline', async ({ page, context }) => {
    // Go online first to cache assets
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();

    // Check if page loaded successfully
    const title = await page.title();
    expect(title).not.toBe('');
    const bodyText = await page.innerText('body');
    expect(bodyText.length).toBeGreaterThan(0);
    
    // Restore online state
    await context.setOffline(false);
  });
});