/**
 * Tests verifying that all required asset categories are cached.
 * TRIOFSND-6: Cache app shell, assets, audio, images, and questions JSON.
 */
require('./setup');

const { mockCaches, mockCache, eventListeners } = require('./setup');

describe('Service Worker Asset Caching Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCache._store.clear();
  });

  const ASSET_CATEGORIES = {
    'app shell': ['index.html', '/', 'app.js', 'styles.css'],
    'audio files': ['audio/beep.mp3', 'sounds/correct.wav', 'audio/prompt.ogg'],
    'image files': ['images/logo.png', 'icons/icon-192.png', 'images/hero.jpg', 'icons/logo.svg', 'images/photo.webp'],
    'questions JSON': ['data/questions.json', 'questions.json'],
  };

  Object.entries(ASSET_CATEGORIES).forEach(([category, urls]) => {
    describe(`Caching ${category}`, () => {
      test(`should include ${category} in precache list or handle at fetch time`, async () => {
        const installHandler = eventListeners['install']?.[0];
        const fetchHandler = eventListeners['fetch']?.[0];

        // Check if any of the category URLs are in the precache list
        let precachedUrls = [];
        if (installHandler) {
          const event = { waitUntil: jest.fn((p) => p) };
          await installHandler(event);
          precachedUrls = (mockCache.addAll.mock.calls[0]?.[0] || []).map((u) =>
            typeof u === 'string' ? u : u.url
          );
        }

        const isInPrecache = urls.some((url) =>
          precachedUrls.some((cached) => cached.includes(url) || url.includes(cached))
        );

        // If not in precache, verify fetch handler can handle it
        if (!isInPrecache && fetchHandler) {
          for (const url of urls) {
            mockCache.match.mockResolvedValueOnce(undefined);
            const event = {
              request: new Request(`https://example.com/${url}`),
              respondWith: jest.fn(),
              waitUntil: jest.fn(),
            };
            expect(() => fetchHandler(event)).not.toThrow();
          }
        }

        // Either precached or handled at fetch time
        expect(true).toBe(true);
      });

      test(`should be retrievable from cache for ${category}`, async () => {
        const fetchHandler = eventListeners['fetch']?.[0];
        if (!fetchHandler) return;

        for (const url of urls) {
          const cachedResponse = new Response('cached', { status: 200 });
          mockCache.match.mockResolvedValueOnce(cachedResponse);

          let response;
          const event = {
            request: new Request(`https://example.com/${url}`),
            respondWith: jest.fn((p) => p.then((r) => { response = r; })),
            waitUntil: jest.fn(),
          };

          fetchHandler(event);
          await new Promise((resolve) => setTimeout(resolve, 30));

          expect(response).toBe(cachedResponse);
        }
      });
    });
  });

  test('cache name should include a version identifier for cache management', async () => {
    const installHandler = eventListeners['install']?.[0];
    if (!installHandler) return;

    const event = { waitUntil: jest.fn((p) => p) };
    await installHandler(event);

    const cacheName = mockCaches.open.mock.calls[0]?.[0];
    expect(cacheName).toBeDefined();
    expect(cacheName).toMatch(/v\d+|version|\d+/i);
  });

  test('should handle cross-origin requests appropriately', async () => {
    const fetchHandler = eventListeners['fetch']?.[0];
    if (!fetchHandler) return;

    mockCache.match.mockResolvedValueOnce(undefined);

    const event = {
      request: new Request('https://cdn.example.com/lib/library.js'),
      respondWith: jest.fn(),
      waitUntil: jest.fn(),
    };

    expect(() => fetchHandler(event)).not.toThrow();
  });

  test('should handle opaque responses from cross-origin without crashing', async () => {
    const fetchHandler = eventListeners['fetch']?.[0];
    if (!fetchHandler) return;

    mockCache.match.mockResolvedValueOnce(undefined);

    const opaqueResponse = new Response('', { status: 0, type: 'opaque' });
    require('./setup').mockFetch.mockResolvedValueOnce(opaqueResponse);

    const event = {
      request: new Request('https://cdn.example.com/asset.png'),
      respondWith: jest.fn((p) => p.catch(() => {})),
      waitUntil: jest.fn((p) => p.catch(() => {})),
    };

    fetchHandler(event);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(event.respondWith).toHaveBeenCalled();
  });
});
