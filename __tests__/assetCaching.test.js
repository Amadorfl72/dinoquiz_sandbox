require('../__mocks__/serviceWorkerMock');

describe('TRIOFSND-6: Asset Caching (CSS, JS, Fonts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.caches._reset();
  });

  describe('Static asset caching', () => {
    it('should cache CSS files with cache-first strategy', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/static/css/main.css'),
        respondWith: jest.fn(),
      };

      const cache = await caches.open('triofsnd-cache-v1');
      await cache.put('/static/css/main.css', new Response('body { color: red; }'));

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      // Cache-first means fetch should NOT be called if cache hit
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should cache JS files with cache-first strategy', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/static/js/main.js'),
        respondWith: jest.fn(),
      };

      const cache = await caches.open('triofsnd-cache-v1');
      await cache.put('/static/js/main.js', new Response('console.log("app")'));

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch from network and cache when asset not in cache', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/static/css/new-styles.css'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/static/css/new-styles.css' })
      );
    });

    it('should update cache when network fetch succeeds for stale assets', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/static/js/main.js'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      const cache = await caches.open('triofsnd-cache-v1');
      expect(cache.put).toHaveBeenCalled();
    });
  });

  describe('Font and icon caching', () => {
    it('should cache font files', async () => {
      const { ASSET_PATTERNS } = require('../src/serviceWorkerConfig');
      expect(ASSET_PATTERNS).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'font' }),
        ])
      );
    });

    it('should cache icon files', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/icons/icon-192.png'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);
      expect(event.respondWith).toHaveBeenCalled();
    });
  });
});
