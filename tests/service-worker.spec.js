const { test, expect } = require('@playwright/test');

test.describe('TRIOFSND-6: Service Worker Setup and Caching', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear all caches and unregister service workers before each test
    const client = await context.newCDPSession(page);
    await client.send('Network.clearBrowserCache');
    await client.send('ServiceWorker.unregister');
    
    await page.goto('http://localhost:3000');
  });

  test('should register a service worker on first load', async ({ page }) => {
    const swRegistered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    });
    
    expect(swRegistered).toBeTruthy();
  });

  test('should cache app shell, assets, audio, images, and questions JSON on first load', async ({ page }) => {
    // Wait for service worker to install and activate
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration && registration.active;
    }, { timeout: 10000 });

    // Give it a moment to finish caching
    await page.waitForTimeout(3000);

    const cacheContents = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      let allUrls = [];
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        allUrls = allUrls.concat(requests.map(req => req.url));
      }
      return allUrls;
    });

    // Check for app shell
    expect(cacheContents.some(url => url.includes('index.html'))).toBeTruthy();
    
    // Check for assets (CSS/JS)
    expect(cacheContents.some(url => url.endsWith('.css') || url.endsWith('.js'))).toBeTruthy();
    
    // Check for audio
    expect(cacheContents.some(url => url.match(/\.(mp3|wav|ogg)$/))).toBeTruthy();
    
    // Check for images
    expect(cacheContents.some(url => url.match(/\.(png|jpg|jpeg|svg|gif)$/))).toBeTruthy();
    
    // Check for questions JSON
    expect(cacheContents.some(url => url.includes('questions.json') || url.includes('questions'))).toBeTruthy();
  });

  test('should serve content offline (PWA installability and offline criteria)', async ({ page, context }) => {
    // Wait for service worker to be active
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration && registration.active;
    }, { timeout: 10000 });

    // Wait for caching to complete
    await page.waitForTimeout(3000);

    // Go offline
    await context.setOffline(true);

    // Reload the page
    await page.reload();

    // Check if the app shell is still rendered
    const bodyVisible = await page.isVisible('body');
    expect(bodyVisible).toBeTruthy();

    // Check if the app didn't show a network error (e.g., dinosaur page)
    const title = await page.title();
    expect(title).not.toBe('No Internet');
    
    // Check if questions are loaded from cache
    const questionsLoaded = await page.evaluate(async () => {
      try {
        const response = await fetch('/questions.json');
        return response.ok;
      } catch (e) {
        return false;
      }
    });
    expect(questionsLoaded).toBeTruthy();

    // Go back online
    await context.setOffline(false);
  });
});