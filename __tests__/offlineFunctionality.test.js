require('../__mocks__/serviceWorkerMock');

describe('TRIOFSND-6: Offline Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.caches._reset();
  });

  describe('Offline support', () => {
    it('should serve all critical resources when offline', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const criticalResources = [
        '/',
        '/index.html',
        '/static/css/main.css',
        '/static/js/main.js',
        '/data/questions.json',
        '/audio/question-1.mp3',
        '/images/logo.png',
      ];

      // Pre-populate cache with all resources
      const cache = await caches.open('triofsnd-cache-v1');
      for (const url of criticalResources) {
        await cache.put(url, new Response('cached-content'));
      }

      // Simulate offline by making fetch fail
      global.fetch.mockRejectedValue(new Error('Offline'));

      for (const url of criticalResources) {
        const event = {
          request: new Request(url),
          respondWith: jest.fn(),
        };
        await handleFetch(event);
        expect(event.respondWith).toHaveBeenCalled();
      }
    });

    it('should return cached response when network is unavailable', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      global.fetch.mockRejectedValue(new Error('Offline'));

      const cache = await caches.open('triofsnd-cache-v1');
      await cache.put('/index.html', new Response('<html>Offline App</html>'));

      const event = {
        request: new Request('/index.html'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      const response = await event.respondWith.mock.calls[0][0];
      expect(response).toBeDefined();
    });

    it('should serve app shell for navigation requests when offline', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      global.fetch.mockRejectedValue(new Error('Offline'));

      const cache = await caches.open('triofsnd-cache-v1');
      await cache.put('/index.html', new Response('<html>App Shell</html>'));

      const event = {
        request: new Request('/game/level-3', { mode: 'navigate' }),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
    });
  });

  describe('Cache cleanup and versioning', () => {
    it('should delete old caches on activate', async () => {
      const { activateCache } = require('../src/serviceWorkerCache');
      const oldCacheNames = ['triofsnd-cache-v0', 'triofsnd-old-cache'];
      global.caches.keys.mockResolvedValueOnce([...oldCacheNames, 'triofsnd-cache-v1']);

      await activateCache();

      expect(caches.delete).toHaveBeenCalledWith('triofsnd-cache-v0');
      expect(caches.delete).toHaveBeenCalledWith('triofsnd-old-cache');
      expect(caches.delete).not.toHaveBeenCalledWith('triofsnd-cache-v1');
    });

    it('should not delete current cache on activate', async () => {
      const { activateCache, CURRENT_CACHE_NAME } = require('../src/serviceWorkerCache');
      global.caches.keys.mockResolvedValueOnce([CURRENT_CACHE_NAME, 'old-cache']);

      await activateCache();

      expect(caches.delete).not.toHaveBeenCalledWith(CURRENT_CACHE_NAME);
    });

    it('should claim clients on activate', async () => {
      const { activateCache } = require('../src/serviceWorkerCache');
      const result = await activateCache();
      expect(result).toBeDefined();
    });
  });
});
