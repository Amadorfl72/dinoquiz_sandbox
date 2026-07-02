/**
 * TRIOFSND-6: PWA Installability Criteria Tests
 * Verifies that the app meets PWA installability requirements including
 * service worker, web app manifest, icons, and offline support.
 */

const fs = require('fs');
const path = require('path');

describe('PWA Installability Criteria (TRIOFSND-6)', () => {
  describe('Web App Manifest', () => {
    test('should have a manifest.json file in the public directory', () => {
      const manifestPath = path.join(__dirname, '../public/manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);
    });

    test('should have required manifest fields for installability', () => {
      const manifestPath = path.join(__dirname, '../public/manifest.json');
      if (!fs.existsSync(manifestPath)) return;

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      expect(manifest.name).toBeDefined();
      expect(typeof manifest.name).toBe('string');
      expect(manifest.name.length).toBeGreaterThan(0);

      expect(manifest.short_name).toBeDefined();
      expect(typeof manifest.short_name).toBe('string');
      expect(manifest.short_name.length).toBeGreaterThan(0);

      expect(manifest.start_url).toBeDefined();
      expect(manifest.display).toBeDefined();
      expect(['fullscreen', 'standalone', 'minimal-ui']).toContain(
        manifest.display
      );

      expect(manifest.background_color).toBeDefined();
      expect(manifest.theme_color).toBeDefined();
    });

    test('should have at least two icons (192px and 512px) for installability', () => {
      const manifestPath = path.join(__dirname, '../public/manifest.json');
      if (!fs.existsSync(manifestPath)) return;

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      expect(manifest.icons).toBeDefined();
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

      const sizes = manifest.icons.map((i) => i.sizes);
      expect(sizes).toContain('192x192');
      expect(sizes).toContain('512x512');
    });

    test('should have maskable icon purpose for Android installability', () => {
      const manifestPath = path.join(__dirname, '../public/manifest.json');
      if (!fs.existsSync(manifestPath)) return;

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const hasMaskable = manifest.icons.some((icon) =>
        icon.purpose?.includes('maskable')
      );

      expect(hasMaskable).toBe(true);
    });
  });

  describe('Service Worker File', () => {
    test('should have a sw.js file in the public directory', () => {
      const swPath = path.join(__dirname, '../public/sw.js');
      expect(fs.existsSync(swPath)).toBe(true);
    });

    test('should contain install event listener in sw.js', () => {
      const swPath = path.join(__dirname, '../public/sw.js');
      if (!fs.existsSync(swPath)) return;

      const swContent = fs.readFileSync(swPath, 'utf8');
      expect(swContent).toMatch(/install/i);
      expect(swContent).toMatch(/addEventListener|oninstall/i);
    });

    test('should contain fetch event listener in sw.js', () => {
      const swPath = path.join(__dirname, '../public/sw.js');
      if (!fs.existsSync(swPath)) return;

      const swContent = fs.readFileSync(swPath, 'utf8');
      expect(swContent).toMatch(/fetch/i);
      expect(swContent).toMatch(/addEventListener|onfetch/i);
    });

    test('should contain activate event listener in sw.js', () => {
      const swPath = path.join(__dirname, '../public/sw.js');
      if (!fs.existsSync(swPath)) return;

      const swContent = fs.readFileSync(swPath, 'utf8');
      expect(swContent).toMatch(/activate/i);
      expect(swContent).toMatch(/addEventListener|onactivate/i);
    });

    test('should reference caches API in sw.js', () => {
      const swPath = path.join(__dirname, '../public/sw.js');
      if (!fs.existsSync(swPath)) return;

      const swContent = fs.readFileSync(swPath, 'utf8');
      expect(swContent).toMatch(/caches\.open/i);
    });
  });

  describe('HTML Link Tags', () => {
    test('should link manifest.json in index.html', () => {
      const htmlPath = path.join(__dirname, '../public/index.html');
      if (!fs.existsSync(htmlPath)) return;

      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      expect(htmlContent).toMatch(
        /<link[^>]*rel=["']manifest["'][^>]*>/i
      );
    });

    test('should register service worker in index.html or main JS', () => {
      const htmlPath = path.join(__dirname, '../public/index.html');
      const jsPath = path.join(__dirname, '../src/sw/register.js');

      let hasRegistration = false;

      if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        hasRegistration = /serviceWorker\.register/i.test(htmlContent);
      }

      if (!hasRegistration && fs.existsSync(jsPath)) {
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        hasRegistration = /serviceWorker\.register/i.test(jsContent);
      }

      expect(hasRegistration).toBe(true);
    });
  });

  describe('Offline Support', () => {
    test('should define cache names with versioning', () => {
      const { CACHE_NAMES } = require('../src/sw/sw-handler');

      expect(CACHE_NAMES).toBeDefined();
      expect(CACHE_NAMES.APP_SHELL).toBeDefined();
      expect(typeof CACHE_NAMES.APP_SHELL).toBe('string');
      expect(CACHE_NAMES.APP_SHELL.length).toBeGreaterThan(0);
    });

    test('should define app shell URLs to cache', () => {
      const { APP_SHELL_URLS } = require('../src/sw/sw-handler');

      expect(APP_SHELL_URLS).toBeDefined();
      expect(Array.isArray(APP_SHELL_URLS)).toBe(true);
      expect(APP_SHELL_URLS.length).toBeGreaterThan(0);
    });

    test('should define audio URLs to cache', () => {
      const { AUDIO_URLS } = require('../src/sw/sw-handler');

      expect(AUDIO_URLS).toBeDefined();
      expect(Array.isArray(AUDIO_URLS)).toBe(true);
    });

    test('should define image URLs to cache', () => {
      const { IMAGE_URLS } = require('../src/sw/sw-handler');

      expect(IMAGE_URLS).toBeDefined();
      expect(Array.isArray(IMAGE_URLS)).toBe(true);
    });
  });
});
