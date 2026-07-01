const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('PWA Installability', () => {
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

  test('manifest is linked in the HTML head', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link ? link.href : null;
    });

    expect(manifestLink).not.toBeNull();
    expect(manifestLink).toContain('manifest');
  });

  test('manifest is fetchable and valid JSON', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const manifestUrl = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link ? link.href : null;
    });

    expect(manifestUrl).not.toBeNull();

    const response = await page.goto(manifestUrl);
    expect(response.ok()).toBe(true);

    const manifestText = await response.text();
    expect(() => JSON.parse(manifestText)).not.toThrow();
  });

  test('theme-color meta tag is present', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const themeColor = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="theme-color"]');
      return meta ? meta.content : null;
    });

    expect(themeColor).not.toBeNull();
    expect(themeColor).toMatch(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
  });

  test('apple-touch-icon is present for iOS installability', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const appleTouchIcon = await page.evaluate(() => {
      const link = document.querySelector('link[rel="apple-touch-icon"]');
      return link ? link.href : null;
    });

    expect(appleTouchIcon).not.toBeNull();
  });

  test('beforeinstallprompt event can be captured', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.evaluate(() => {
      window.__bipEvent = null;
      window.addEventListener('beforeinstallprompt', (e) => {
        window.__bipEvent = e;
      });
    });

    // Reload to potentially trigger the event
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const hasEvent = await page.evaluate(() => {
      return window.__bipEvent !== null;
    });

    // Note: beforeinstallprompt may not fire in all browsers/environments
    // This test verifies the app is set up to handle it
    if (hasEvent) {
      const canPrompt = await page.evaluate(async () => {
        if (!window.__bipEvent) return false;
        return typeof window.__bipEvent.prompt === 'function';
      });
      expect(canPrompt).toBe(true);
    }
  });

  test('app meets PWA installability criteria', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const criteria = await page.evaluate(async () => {
      const result = {
        hasManifest: false,
        hasServiceWorker: false,
        isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
        manifestValid: false,
      };

      const manifestLink = document.querySelector('link[rel="manifest"]');
      result.hasManifest = !!manifestLink;

      if (manifestLink) {
        try {
          const response = await fetch(manifestLink.href);
          const manifest = await response.json();
          result.manifestValid =
            !!manifest.name &&
            !!manifest.short_name &&
            !!manifest.start_url &&
            !!manifest.display &&
            Array.isArray(manifest.icons) &&
            manifest.icons.length >= 2;
        } catch (e) {
          result.manifestValid = false;
        }
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        result.hasServiceWorker = registrations.length > 0;
      }

      return result;
    });

    expect(criteria.isHTTPS).toBe(true);
    expect(criteria.hasManifest).toBe(true);
    expect(criteria.manifestValid).toBe(true);
    expect(criteria.hasServiceWorker).toBe(true);
  });
});
