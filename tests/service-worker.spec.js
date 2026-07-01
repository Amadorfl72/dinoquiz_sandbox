const { test, expect } = require('@playwright/test');

const EXPECTED_CACHED_FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/assets/audio/sample.mp3',
  '/assets/images/logo.png',
  '/data/questions.json'
];

test.describe('TRIOFSND-6: Service Worker Setup and Caching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Wait for service worker to register and activate
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 10000 });
  });

  test('Service Worker is registered and active', async ({ page }) => {
    const isRegistered = await page.evaluate(() => 
      navigator.serviceWorker.getRegistration().then(reg => !!reg)
    );
    expect(isRegistered).toBeTruthy();
  });

  test('App shell, assets, audio, images, and questions JSON are cached on first load', async ({ page }) => {
    // Wait for caching to complete after first load
    await page.waitForTimeout(3000);

    const cachedRequests = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      let allRequests = [];
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        allRequests = allRequests.concat(requests.map(req => req.url));
      }
      return allRequests;
    });

    for (const file of EXPECTED_CACHED_FILES) {
      expect(cachedRequests.some(url => url.includes(file))).toBeTruthy();
    }
  });

  test('App is installable (has manifest and service worker)', async ({ page }) => {
    const hasManifest = await page.evaluate(() => {
      return document.querySelector('link[rel="manifest"]') !== null;
    });
    expect(hasManifest).toBeTruthy();

    const manifestContent = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      const response = await fetch(link.href);
      return response.json();
    });
    expect(manifestContent.name).toBeDefined();
    expect(manifestContent.icons.length).toBeGreaterThan(0);

    const hasSW = await page.evaluate(() => navigator.serviceWorker.controller !== null);
    expect(hasSW).toBeTruthy();
  });

  test('App works offline using cached resources', async ({ page, context }) => {
    await context.setOffline(true);
    
    // Reload the page
    await page.reload();
    
    // Check if the app shell is still loaded
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.length).toBeGreaterThan(0);

    // Turn offline back off
    await context.setOffline(false);
  });
});