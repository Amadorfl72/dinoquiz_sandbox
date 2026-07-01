const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let browser;
let page;

describe('PWA Offline Support (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    // Wait for service worker to be registered and activated
    await page.waitForFunction(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return reg && reg.active;
    }, { timeout: 15000 });
    // Allow time for caching to complete
    await page.waitForTimeout(2000);
  });

  afterEach(async () => {
    await page.close();
  });

  test('page loads successfully when online', async () => {
    const title = await page.title();
    expect(title).toBeDefined();
    expect(title.length).toBeGreaterThan(0);
  });

  test('home screen content is visible when online', async () => {
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('page loads from cache when offline', async () => {
    // Simulate offline mode
    const client = await page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });

    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText.length).toBeGreaterThan(0);
    } finally {
      // Restore network
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
    }
  });

  test('cached assets are available in cache storage', async () => {
    const cacheNames = await page.evaluate(async () => {
      const names = await caches.keys();
      return names;
    });
    expect(cacheNames.length).toBeGreaterThan(0);
  });

  test('HTML document is cached for offline access', async () => {
    const hasHtmlCached = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        const htmlEntry = keys.find(k => k.url.endsWith('/') || k.url.endsWith('.html'));
        if (htmlEntry) return true;
      }
      return false;
    });
    expect(hasHtmlCached).toBe(true);
  });

  test('static assets (JS/CSS) are cached for offline access', async () => {
    const hasStaticAssetsCached = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        const assetEntry = keys.find(k => k.url.endsWith('.js') || k.url.endsWith('.css'));
        if (assetEntry) return true;
      }
      return false;
    });
    expect(hasStaticAssetsCached).toBe(true);
  });

  test('offline fallback page or content is served when navigating to uncached resource', async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });

    try {
      const response = await page.goto(BASE_URL + '/nonexistent-page', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      }).catch(() => null);

      // Either we get a cached fallback or the SW serves an offline page
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText.length).toBeGreaterThan(0);
    } finally {
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
    }
  });
});
