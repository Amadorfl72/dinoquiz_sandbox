const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('PWA Offline Support', () => {
  let browser;
  let context;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  test('app loads successfully when online', async () => {
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    expect(response.ok()).toBe(true);
  });

  test('service worker caches the home page for offline use', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // Give the SW time to cache
    await page.waitForTimeout(2000);

    const cacheKeys = await page.evaluate(async () => {
      const keys = await caches.keys();
      return keys;
    });
    expect(cacheKeys.length).toBeGreaterThan(0);
  });

  test('app is accessible when offline', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForTimeout(2000);

    await context.setOffline(true);

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const title = await page.title();
    expect(title).toBeDefined();
    expect(title.length).toBeGreaterThan(0);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.length).toBeGreaterThan(0);

    await context.setOffline(false);
  });

  test('cached assets are served from cache when offline', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForTimeout(2000);

    await context.setOffline(true);

    const cachedResponses = await page.evaluate(async () => {
      const keys = await caches.keys();
      let cachedCount = 0;
      for (const key of keys) {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        cachedCount += requests.length;
      }
      return cachedCount;
    });

    expect(cachedCount).toBeGreaterThan(0);

    await context.setOffline(false);
  });
});
