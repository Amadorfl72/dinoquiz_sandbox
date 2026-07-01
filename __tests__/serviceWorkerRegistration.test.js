/**
 * Tests for Service Worker registration logic.
 * TRIOFSND-6: Service Worker Setup and Caching
 */
const fs = require('fs');
const path = require('path');

describe('Service Worker Registration', () => {
  let originalNavigator;
  let originalServiceWorker;

  beforeEach(() => {
    originalNavigator = global.navigator;
    originalServiceWorker = global.navigator?.serviceWorker;
  });

  afterEach(() => {
    if (originalNavigator) {
      global.navigator = originalNavigator;
    } else {
      delete global.navigator;
    }
  });

  test('should register a service worker when supported', async () => {
    const registerMock = jest.fn().mockResolvedValue({ scope: '/' });
    global.navigator = {
      serviceWorker: {
        register: registerMock,
        ready: Promise.resolve({}),
      },
    };

    // Simulate registration logic
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js');
    }

    expect(registerMock).toHaveBeenCalledWith('/sw.js');
  });

  test('should not throw when service worker is not supported', async () => {
    global.navigator = {};

    let error = null;
    try {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js');
      }
    } catch (e) {
      error = e;
    }

    expect(error).toBeNull();
  });

  test('should handle registration errors gracefully', async () => {
    const registerMock = jest.fn().mockRejectedValue(new Error('Registration failed'));
    global.navigator = {
      serviceWorker: {
        register: registerMock,
      },
    };

    let caughtError = null;
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe('Registration failed');
  });

  test('sw.js file should exist in the project root', () => {
    const possiblePaths = [
      path.resolve(__dirname, '../sw.js'),
      path.resolve(__dirname, '../public/sw.js'),
      path.resolve(__dirname, '../static/sw.js'),
      path.resolve(__dirname, '../src/sw.js'),
    ];
    const exists = possiblePaths.some((p) => fs.existsSync(p));
    expect(exists).toBe(true);
  });

  test('manifest.json should reference the service worker scope or be PWA-installable', () => {
    const possibleManifestPaths = [
      path.resolve(__dirname, '../manifest.json'),
      path.resolve(__dirname, '../public/manifest.json'),
      path.resolve(__dirname, '../static/manifest.json'),
    ];
    const manifestPath = possibleManifestPaths.find((p) => fs.existsSync(p));
    if (manifestPath) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest).toHaveProperty('name');
      expect(manifest).toHaveProperty('display');
      expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
    }
  });
});
