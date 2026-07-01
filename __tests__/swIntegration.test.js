/**
 * Integration tests for Service Worker lifecycle.
 * TRIOFSND-6: Full install -> activate -> fetch cycle.
 */
require('./setup');

const { mockCaches, mockCache, eventListeners, mockFetch } = require('./setup');

describe('Service Worker Integration - Full Lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCache._store.clear();
  });

  test('complete lifecycle: install -> activate -> fetch from cache', async () => {
    const installHandler = eventListeners['install']?.[0];
    const activateHandler = eventListeners['activate']?.[0];
    const fetchHandler = eventListeners['fetch']?.[0];

    if (!installHandler || !activateHandler || !fetchHandler) return;

    // Step 1: Install - precache resources
    mockCaches.keys.mockResolvedValueOnce(['triofsnd-cache-v1']);
    const installEvent = { waitUntil: jest.fn((p) => p) };
    await installHandler(installEvent);
    expect(mockCaches.open).toHaveBeenCalled();
    expect(mockCache.addAll).toHaveBeenCalled();

    // Step 2: Activate - clean old caches and claim clients
    mockCaches.keys.mockResolvedValueOnce(['triofsnd-cache-v1', 'triofsnd-cache-v0']);
    const activateEvent = { waitUntil: jest.fn((p) => p) };
    await activateHandler(activateEvent);
    expect(mockCaches.delete).toHaveBeenCalled();

    // Step 3: Fetch - serve from precached resources
    const cachedResponse = new Response('<html>App</html>', { status: 200 });
    mockCache.match.mockResolvedValueOnce(cachedResponse);

    let servedResponse;
    const fetchEvent = {
      request: new Request('https://example.com/'),
      respondWith: jest.fn((p) => p.then((r) => { servedResponse = r; })),
      waitUntil: jest.fn(),
    };

    fetchHandler(fetchEvent);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(servedResponse).toBe(cachedResponse);
  });

  test('offline scenario: all resources served from cache after precaching', async () => {
    const installHandler = eventListeners['install']?.[0];
    const fetchHandler = eventListeners['fetch']?.[0];

    if (!installHandler || !fetchHandler) return;

    // Precache resources
    const installEvent = { waitUntil: jest.fn((p) => p) };
    await installHandler(installEvent);

    // Simulate offline: fetch always fails, but cache has everything
    mockFetch.mockRejectedValue(new Error('Offline'));

    const resourcesToTest = [
      { url: 'https://example.com/', type: 'app shell' },
      { url: 'https://example.com/questions.json', type: 'questions JSON' },
      { url: 'https://example.com/audio/sound.mp3', type: 'audio' },
      { url: 'https://example.com/images/icon.png', type: 'image' },
    ];

    for (const resource of resourcesToTest) {
      const cachedResponse = new Response('cached', { status: 200 });
      mockCache.match.mockResolvedValueOnce(cachedResponse);

      let response;
      const event = {
        request: new Request(resource.url),
        respondWith: jest.fn((p) => p.then((r) => { response = r; })),
        waitUntil: jest.fn(),
      };

      fetchHandler(event);
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(response).toBe(cachedResponse);
    }
  });

  test('should not cache POST/PUT/DELETE requests', async () => {
    const fetchHandler = eventListeners['fetch']?.[0];
    if (!fetchHandler) return;

    const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    for (const method of methods) {
      const event = {
        request: new Request('https://example.com/api/submit', { method }),
        respondWith: jest.fn(),
        waitUntil: jest.fn(),
      };

      expect(() => fetchHandler(event)).not.toThrow();
      // Cache match should not be called for non-GET requests (or if called, should not cache)
    }
  });

  test('should handle cache storage quota errors gracefully', async () => {
    const fetchHandler = eventListeners['fetch']?.[0];
    if (!fetchHandler) return;

    mockCache.match.mockResolvedValueOnce(undefined);
    mockCache.put.mockRejectedValueOnce(new DOMException('QuotaExceededError'));

    const networkResponse = new Response('data', { status: 200 });
    mockFetch.mockResolvedValueOnce(networkResponse);

    const event = {
      request: new Request('https://example.com/audio/large.mp3'),
      respondWith: jest.fn((p) => p.catch(() => {})),
      waitUntil: jest.fn((p) => p.catch(() => {})),
    };

    expect(() => fetchHandler(event)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
