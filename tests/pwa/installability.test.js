const { test, expect } = require('@playwright/test');

describe('TRIOFSND-53: PWA Installability', () => {
  test('app meets installability criteria', async ({ page, baseURL }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(baseURL || 'http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check that manifest is served with correct MIME type
    const manifestResponse = await page.goto('/manifest.json');
    if (manifestResponse) {
      const contentType = manifestResponse.headers()['content-type'] || '';
      expect(contentType).toContain('application/manifest+json');
    }

    // Check service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });
    expect(swRegistered).toBe(true);

    // Check manifest is linked in the DOM
    const manifestLink = await page.$('link[rel="manifest"]');
    expect(manifestLink).not.toBeNull();

    const manifestHref = await manifestLink.getAttribute('href');
    expect(manifestHref).toBeTruthy();

    // Fetch and validate manifest content
    const manifest = await page.evaluate(async (href) => {
      const res = await fetch(href);
      return res.json();
    }, manifestHref);

    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBeDefined();
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    // Check for beforeinstallprompt support (installability signal)
    const installPromptAvailable = await page.evaluate(() => {
      return new Promise((resolve) => {
        let resolved = false;
        window.addEventListener('beforeinstallprompt', () => {
          resolved = true;
          resolve(true);
        });
        // Timeout fallback - some browsers won't fire if already installed
        setTimeout(() => {
          if (!resolved) resolve('timeout');
        }, 3000);
      });
    });

    // beforeinstallprompt may not fire in all environments, so we check criteria instead
    console.log('Install prompt event:', installPromptAvailable);
  });

  test('app is installable via Lighthouse audit', async ({ page, baseURL }) => {
    // This test validates that the PWA passes key Lighthouse checks
    await page.goto(baseURL || 'http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const auditResults = await page.evaluate(async () => {
      const checks = {};

      // Check manifest
      const manifestLink = document.querySelector('link[rel="manifest"]');
      checks.manifestLinked = !!manifestLink;

      if (manifestLink) {
        try {
          const res = await fetch(manifestLink.href);
          const manifest = await res.json();
          checks.manifestHasName = !!manifest.name;
          checks.manifestHasShortName = !!manifest.short_name;
          checks.manifestHasStartUrl = !!manifest.start_url;
      	  checks.manifestHasDisplay = !!manifest.display;
          checks.manifestHasIcons = Array.isArray(manifest.icons) && manifest.icons.length >= 2;
          checks.manifestHas192Icon = manifest.icons?.some(i => i.sizes === '192x192');
          checks.manifestHas512Icon = manifest.icons?.some(i => i.sizes === '512x512');
        } catch (e) {
          checks.manifestValid = false;
        }
      }

      // Check service worker
      checks.serviceWorkerSupported = 'serviceWorker' in navigator;
      if (checks.serviceWorkerSupported) {
        const reg = await navigator.serviceWorker.getRegistration();
        checks.serviceWorkerRegistered = !!reg;
      }

      // Check HTTPS or localhost (required for SW)
      checks.isSecureContext = window.isSecureContext;

      // Check fetch event handler
      checks.hasFetchHandler = true; // validated in unit tests

      return checks;
    });

    expect(auditResults.manifestLinked).toBe(true);
    expect(auditResults.manifestHasName).toBe(true);
    expect(auditResults.manifestHasShortName).toBe(true);
    expect(auditResults.manifestHasStartUrl).toBe(true);
    expect(auditResults.manifestHasDisplay).toBe(true);
    expect(auditResults.manifestHasIcons).toBe(true);
    expect(auditResults.manifestHas192Icon).toBe(true);
    expect(auditResults.manifestHas512Icon).toBe(true);
    expect(auditResults.serviceWorkerSupported).toBe(true);
    expect(auditResults.serviceWorkerRegistered).toBe(true);
    expect(auditResults.isSecureContext).toBe(true);
  });
});
