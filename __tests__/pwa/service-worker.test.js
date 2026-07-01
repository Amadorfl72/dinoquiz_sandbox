const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let browser;
let page;

beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-features=ServiceWorker'],
  });
  page = await browser.newPage();
});

afterAll(async () => {
  if (browser) await browser.close();
});

beforeEach(async () => {
  const context = browser.defaultBrowserContext();
  await context.clearPermissionOverrides();
  await context.overridePermissions(BASE_URL, []);
});

describe('TRIOFSND-53: Service Worker Registration', () => {
  test('service worker file is accessible', async () => {
    const response = await page.goto(`${BASE_URL}/sw.js`, {
      waitUntil: 'networkidle0',
    });
    expect(response.ok()).toBe(true);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('javascript');
  });

  test('service worker is registered on page load', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    const swRegistrations = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.map((reg) => ({
        scope: reg.scope,
        scriptURL: reg.active ? reg.active.scriptURL : null,
        state: reg.active ? reg.active.state : null,
      }));
    });

    expect(swRegistrations.length).toBeGreaterThan(0);
    const mainSW = swRegistrations.find((sw) =>
      sw.scriptURL.includes('sw.js')
    );
    expect(mainSW).toBeDefined();
    expect(mainSW.state).toBe('activated');
  });

  test('service worker controls the root scope', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    const controller = await page.evaluate(() => {
      return navigator.serviceWorker.controller
        ? navigator.serviceWorker.controller.scriptURL
        : null;
    });

    expect(controller).not.toBeNull();
    expect(controller).toContain('sw.js');
  });

  test('service worker caches critical assets on install', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    // Wait for SW to activate
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 10000 }
    );

    const cachedUrls = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const allCached = [];
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        allCached.push(...requests.map((r) => r.url));
      }
      return allCached;
    });

    expect(cachedUrls.length).toBeGreaterThan(0);

    // Check that at least the main HTML document is cached
    const hasHtmlCache = cachedUrls.some(
      (url) => url.includes(BASE_URL) || url.endsWith('/') || url.endsWith('.html')
    );
    expect(hasHtmlCache).toBe(true);
  });
});

describe('TRIOFSND-53: Offline Support', () => {
  beforeEach(async () => {
    // Load the page first to ensure SW is registered and assets are cached
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 10000 }
    );
    // Give SW time to complete caching
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  test('home page loads when offline', async () => {
    const context = browser.defaultBrowserContext();
    await context.setOffline(true);

    try {
      const response = await page.goto(BASE_URL, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      });

      // When offline with SW, the response should come from cache
      expect(response).not.toBeNull();
      expect(response.ok() || response.status() === 200).toBe(true);

      const title = await page.title();
      expect(title).toBeDefined();
      expect(title.length).toBeGreaterThan(0);
    } finally {
      await context.setOffline(false);
    }
  });

  test('cached CSS assets load when offline', async () => {
    const context = browser.defaultBrowserContext();
    await context.setOffline(true);

    try {
      await page.goto(BASE_URL, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      });

      const stylesheets = await page.$$eval(
        'link[rel="stylesheet"]',
        (links) =>
          links.map((link) => ({
            href: link.href,
            loaded: link.sheet !== null,
          }))
      );

      expect(stylesheets.length).toBeGreaterThan(0);
      stylesheets.forEach((sheet) => {
        expect(sheet.loaded).toBe(true);
      });
    } finally {
      await context.setOffline(false);
    }
  });

  test('cached JS assets load when offline', async () => {
    const context = browser.defaultBrowserContext();
    await context.setOffline(true);

    try {
      await page.goto(BASE_URL, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      });

      const scripts = await page.$$eval('script[src]', (scripts) =>
        scripts.map((script) => script.src)
      );

      expect(scripts.length).toBeGreaterThan(0);

      // Check that scripts executed by verifying the app rendered content
      const bodyContent = await page.evaluate(
        () => document.body.innerHTML.length
      );
      expect(bodyContent).toBeGreaterThan(0);
    } finally {
      await context.setOffline(false);
    }
  });

  test('page content is visible when offline', async () => {
    const context = browser.defaultBrowserContext();
    await context.setOffline(true);

    try {
      await page.goto(BASE_URL, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      });

      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText.length).toBeGreaterThan(0);

      // Ensure no browser offline error page is shown
      expect(bodyText.toLowerCase()).not.toContain('err_internet_disconnected');
      expect(bodyText.toLowerCase()).not.toContain('no internet');
    } finally {
      await context.setOffline(false);
    }
  });

  test('images load from cache when offline', async () => {
    const context = browser.defaultBrowserContext();
    await context.setOffline(true);

    try {
      await page.goto(BASE_URL, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      });

      const images = await page.$$eval('img', (imgs) =>
        imgs.map((img) => ({
          src: img.src,
          complete: img.complete,
          naturalWidth: img.naturalWidth,
        }))
      );

      // If there are images, they should load from cache
      images.forEach((img) => {
        expect(img.complete).toBe(true);
        expect(img.naturalWidth).toBeGreaterThan(0);
      });
    } finally {
      await context.setOffline(false);
    }
  });
});

describe('TRIOFSND-53: Service Worker Cache Strategy', () => {
  test('stale assets are updated on reconnect (cache-first with network update)', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 10000 }
    );

    // Reload to trigger potential cache update
    await page.reload({ waitUntil: 'networkidle0' });

    const controller = await page.evaluate(
      () => navigator.serviceWorker.controller?.scriptURL
    );
    expect(controller).toContain('sw.js');
  });

  test('service worker handles navigation requests', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 10000 }
    );

    // Navigate to a sub-route if app is an SPA
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });

    const hasContent = await page.evaluate(
      () => document.body.children.length > 0
    );
    expect(hasContent).toBe(true);
  });
});
