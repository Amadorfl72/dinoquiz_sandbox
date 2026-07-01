require('../__mocks__/serviceWorkerMock');

describe('TRIOFSND-6: Questions JSON Caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.caches._reset();
  });

  describe('Questions JSON caching on first load', () => {
    it('should cache questions JSON file', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/data/questions.json'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/data/questions.json' })
      );
    });

    it('should cache questions JSON with network-first strategy', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/data/questions.json'),
        respondWith: jest.fn(),
      };

      // Pre-populate cache
      const cache = await caches.open('triofsnd-cache-v1');
      await cache.put('/data/questions.json', new Response(JSON.stringify({ questions: [] })));

      await handleFetch(event);

      // Network-first: should try network even if cached
      expect(fetch).toHaveBeenCalled();
    });

    it('should fall back to cached questions JSON when network fails', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const event = {
        request: new Request('/data/questions.json'),
        respondWith: jest.fn(),
      };

      const cache = await caches.open('triofsnd-cache-v1');
      await cache.put('/data/questions.json', new Response(JSON.stringify({ questions: [{ id: 1 }] })));

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalled();
    });

    it('should update cache when fresh questions JSON is fetched', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/data/questions.json'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      const cache = await caches.open('triofsnd-cache-v1');
      expect(cache.put).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/data/questions.json' }),
        expect.any(Response)
      );
    });
  });

  describe('Questions JSON cache configuration', () => {
    it('should define questions JSON path in config', async () => {
      const { QUESTIONS_JSON_URL } = require('../src/serviceWorkerConfig');
      expect(QUESTIONS_JSON_URL).toBeDefined();
      expect(QUESTIONS_JSON_URL).toMatch(/\.json$/);
    });

    it('should include questions JSON in precache list', async () => {
      const { PRECACHE_URLS } = require('../src/serviceWorkerConfig');
      expect(PRECACHE_URLS).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/questions.*\.json$/),
        ])
      );
    });
  });
});
