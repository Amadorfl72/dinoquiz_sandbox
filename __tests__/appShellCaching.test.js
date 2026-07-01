require('../__mocks__/serviceWorkerMock');

describe('TRIOFSND-6: App Shell Caching', () => {
  const APP_SHELL_RESOURCES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/static/css/main.css',
    '/static/js/main.js',
    '/static/js/vendor.js',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    global.caches._reset();
  });

  describe('Cache storage initialization', () => {
    it('should open a cache with a versioned name', async () => {
      const { CACHE_NAME, openCache } = require('../src/serviceWorkerConfig');
      await openCache();

      expect(caches.open).toHaveBeenCalledWith(CACHE_NAME);
      expect(CACHE_NAME).toMatch(/^triofsnd-cache-v\d+$/);
    });

    it('should cache app shell resources on install event', async () => {
      const { cacheAppShell } = require('../src/serviceWorkerCache');
      await cacheAppShell();

      expect(caches.open).toHaveBeenCalled();
      const mockCache = await caches.open('triofsnd-cache-v1');
      expect(mockCache.addAll).toHaveBeenCalledWith(
        expect.arrayContaining(APP_SHELL_RESOURCES)
      );
    });

    it('should cache all required app shell files', async () => {
      const { APP_SHELL_URLS, cacheAppShell } = require('../src/serviceWorkerConfig');
      await cacheAppShell();

      const mockCache = await caches.open('triofsnd-cache-v1');
      const addAllCall = mockCache.addAll.mock.calls[0][0];

      APP_SHELL_URLS.forEach((url) => {
        expect(addAllCall).toContain(url);
      });
    });
  });

  describe('App shell fetch handling', () => {
    it('should serve app shell from cache when offline', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/index.html'),
        respondWith: jest.fn(),
      };

      // Pre-populate cache
      const cache = await caches.open('triofsnd-cache-v1');
      await cache.put('/index.html', new Response('<html></html>'));

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      const responsePromise = event.respondWith.mock.calls[0][0];
      const response = await responsePromise;
      expect(response).toBeDefined();
    });

    it('should fall back to cached index.html for navigation requests', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/some-route', { mode: 'navigate' }),
        respondWith: jest.fn(),
      };

      const cache = await caches.open('triofsnd-cache-v1');
      await cache.put('/index.html', new Response('<html><body>App Shell</body></html>'));

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
    });

    it('should fetch from network when online and cache not available', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/index.html'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalled();
    });
  });
});
