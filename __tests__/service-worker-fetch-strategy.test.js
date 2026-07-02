/**
 * TRIOFSND-6: Service Worker Fetch Strategy Tests
 * Verifies that the service worker serves cached resources when offline
 * and uses appropriate caching strategies.
 */

const mockCache = {
  addAll: jest.fn().mockResolvedValue(undefined),
  add: jest.fn().mockResolvedValue(undefined),
  put: jest.fn().mockResolvedValue(undefined),
  match: jest.fn().mockResolvedValue(undefined),
  keys: jest.fn().mockResolvedValue([]),
  delete: jest.fn().mockResolvedValue(true),
};

const mockCaches = {
  open: jest.fn().mockResolvedValue(mockCache),
  has: jest.fn().mockResolvedValue(false),
  delete: jest.fn().mockResolvedValue(true),
  keys: jest.fn().mockResolvedValue([]),
  match: jest.fn().mockResolvedValue(undefined),
};

global.caches = mockCaches;

describe('Service Worker Fetch Strategy (TRIOFSND-6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fetch Event Handling', () => {
    test('should respond with cached resource when available', async () => {
      const cachedResponse = new Response('cached content', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
      mockCaches.match.mockResolvedValueOnce(cachedResponse);

      const { handleFetch } = require('../src/sw/sw-handler');
      const event = {
        request: new Request('https://example.com/index.html'),
        respondWith: jest.fn((p) => p),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      expect(mockCaches.match).toHaveBeenCalledWith(event.request);
    });

    test('should fall back to network when resource is not cached', async () => {
      mockCaches.match.mockResolvedValueOnce(undefined);
      global.fetch = jest.fn().mockResolvedValue(
        new Response('network content', { status: 200 })
      );

      const { handleFetch } = require('../src/sw/sw-handler');
      const event = {
        request: new Request('https://example.com/api/data'),
        respondWith: jest.fn((p) => p),
      };

      await handleFetch(event);

      expect(global.fetch).toHaveBeenCalledWith(event.request);
    });

    test('should serve cached app shell when offline and resource not found', async () => {
      mockCaches.match.mockResolvedValueOnce(undefined);
      global.fetch = jest.fn().mockRejectedValue(new Error('Offline'));
      const fallbackResponse = new Response('<html>Offline</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
      mockCache.match.mockResolvedValueOnce(fallbackResponse);

      const { handleFetch } = require('../src/sw/sw-handler');
      const event = {
        request: new Request('https://example.com/some-page'),
        respondWith: jest.fn((p) => p),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
    });
  });

  describe('Cache-First Strategy for Static Assets', () => {
    test('should use cache-first strategy for CSS files', async () => {
      const cachedResponse = new Response('body {}', {
        status: 200,
        headers: { 'Content-Type': 'text/css' },
      });
      mockCaches.match.mockResolvedValueOnce(cachedResponse);
      global.fetch = jest.fn();

      const { handleFetch } = require('../src/sw/sw-handler');
      const event = {
        request: new Request('https://example.com/styles.css'),
        respondWith: jest.fn((p) => p),
      };

      await handleFetch(event);

      expect(mockCaches.match).toHaveBeenCalledWith(event.request);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should use cache-first strategy for JS files', async () => {
      const cachedResponse = new Response('console.log(1)', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      });
      mockCaches.match.mockResolvedValueOnce(cachedResponse);
      global.fetch = jest.fn();

      const { handleFetch } = require('../src/sw/sw-handler');
      const event = {
        request: new Request('https://example.com/app.js'),
        respondWith: jest.fn((p) => p),
      }

      await handleFetch(event);

      expect(mockCaches.match).toHaveBeenCalledWith(event.request);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should use cache-first strategy for image files', async () => {
      const cachedResponse = new Response('image-data', {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      });
      mockCaches.match.mockResolvedValueOnce(cachedResponse);
      global.fetch = jest.fn();

      const { handleFetch } = require('../src/sw/sw-handler');
      const event = {
        request: new Request('https://example.com/logo.png'),
        respondWith: jest.fn((p) => p),
      };

      await handleFetch(event);

      expect(mockCaches.match).toHaveBeenCalledWith(event.request);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should use cache-first strategy for audio files', async () => {
      const cachedResponse = new Response('audio-data', {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      });
      mockCaches.match.mockResolvedValueOnce(cachedResponse);
      global.fetch = jest.fn();

      const { handleFetch } = require('../src/sw/sw-handler');
      const event = {
        request: new Request('https://example.com/sound.mp3'),
        respondWith: jest.fn((p) => p),
      };

      await handleFetch(event);

      expect(mockCaches.match).toHaveBeenCalledWith(event.request);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Network-First Strategy for Questions JSON', () => {
    test('should attempt network first for questions JSON', async () => {
      mockCaches.match.mockResolvedValueOnce(undefined);
      const networkResponse = new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      global.fetch = jest.fn().mockResolvedValue(networkResponse);

      const { handleFetch } = require('../src/sw/sw-handler');
      const event = {
        request: new Request('https://example.com/data/questions.json'),
        respondWith: jest.fn((p) => p),
      };

      await handleFetch(event);

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should fall back to cache for questions JSON when offline', async () => {
      const cachedResponse = new Response('{"questions":[]}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      global.fetch = jest.fn().mockRejectedValue(new Error('Offline'));
      mockCache.match.mockResolvedValueOnce(cachedResponse);

      const { handleFetch } = require('../src/sw/sw-handler');
      const event = {
        request: new Request('https://example.com/data/questions.json'),
        respondWith: jest.fn((p) => p),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
    });
  });

  describe('Cache Update on Activate', () => {
    test('should delete old caches on activate', async () => {
      const oldCacheName = 'triofsnd-old-v1';
      const currentCacheName = 'triofsnd-v2';
      mockCaches.keys.mockResolvedValueOnce([oldCacheName, currentCacheName]);

      const { CACHE_NAMES, handleActivate } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleActivate(event);

      expect(mockCaches.delete).toHaveBeenCalledWith(oldCacheName);
      expect(mockCaches.delete).not.toHaveBeenCalledWith(
        CACHE_NAMES.APP_SHELL
      );
    });

    test('should take control of clients immediately', async () => {
      const { handleActivate } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleActivate(event);

      expect(event.waitUntil).toHaveBeenCalled();
    });
  });
});
