require('../__mocks__/serviceWorkerMock');

describe('TRIOFSND-6: Image Caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.caches._reset();
  });

  describe('Image file caching', () => {
    it('should cache PNG images', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/images/logo.png'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
    });

    it('should cache JPG images', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/images/photo.jpg'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
    });

    it('should cache SVG images', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/images/icon.svg'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
    });

    it('should cache WebP images', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/images/hero.webp'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
    });

    it('should serve images from cache when available', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/images/logo.png'),
        respondWith: jest.fn(),
      };

      const cache = await caches.open('triofsnd-cache-v1');
      await cache.put('/images/logo.png', new Response('png-data'));

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should use stale-while-revalidate for images', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/images/logo.png'),
        respondWith: jest.fn(),
      };

      const cache = await caches.open('triofsnd-cache-v1');
      await cache.put('/images/logo.png', new Response('stale-png-data'));

      await handleFetch(event);

      // SWR should serve from cache AND fetch from network
      expect(event.respondWith).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Image cache configuration', () => {
    it('should define image file extensions in config', async () => {
      const { IMAGE_EXTENSIONS } = require('../src/serviceWorkerConfig');
      expect(IMAGE_EXTENSIONS).toEqual(
        expect.arrayContaining(['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'])
      );
    });
  });
});
