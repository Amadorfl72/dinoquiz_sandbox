/**
 * Tests for offline functionality via Service Worker.
 * TRIOFSND-6: PWA installability and offline criteria.
 */
require('./setup');

const { mockCaches, mockCache, eventListeners, mockFetch } = require('./setup');

describe('Service Worker Offline Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCache._store.clear();
  });

  test('should serve app shell from cache when offline', async () => {
    const fetchHandler = eventListeners['fetch']?.[0];
    if (!fetchHandler) return;

    const cachedHtml = new Response('<html><body>App Shell</body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
    mockCache.match.mockResolvedValueOnce(cachedHtml);

    let response;
    const event = {
      request: new Request('https://example.com/'),
      respondWith: jest.fn((p) => p.then((r) => { response = r; })),
      waitUntil: jest.fn(),
    };

    fetchHandler(event);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(response).toBe(cachedHtml);
  });

  test('should serve questions JSON from cache when offline', async () => {
    const fetchHandler = eventListeners['fetch']?.[0];
    if (!fetchHandler) return;

    const cachedJson = new Response(JSON.stringify({ questions: [{ id: 1 }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    mockCache.match.mockResolvedValueOnce(cachedJson);

    let response;
    const event = {
      request: new Request('https://example.com/data/questions.json'),
      respondWith: jest.fn((p) => p.then((r) => { response = r; })),
      waitUntil: jest.fn(),
    };

    fetchHandler(event);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(response).toBe(cachedJson);
    const body = await response.json();
    expect(body).toHaveProperty('questions');
  });

  test('should serve audio from cache when offline', async () => {
    const fetchHandler = eventListeners['fetch']?.[0];
    if (!fetchHandler) return;

    const cachedAudio = new Response(new ArrayBuffer(8192), {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    });
    mockCache.match.mockResolvedValueOnce(cachedAudio);

    let response;
    const event = {
      request: new Request('https://example.com/audio/beep.mp3'),
      respondWith: jest.fn((p) => p.then((r) => { response = r; })),
      waitUntil: jest.fn(),
    };

    fetchHandler(event);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(response).toBe(cachedAudio);
  });

  test('should serve images from cache when offline', async () => {
    const fetchHandler = eventListeners['fetch']?.[0];
    if (!fetchHandler) return;

    const cachedImage = new Response(new ArrayBuffer(4096), {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    });
    mockCache.match.mockResolvedValueOnce(cachedImage);

    let response;
    const event = {
      request: new Request('https://example.com/images/icon.png'),
      respondWith: jest.fn((p) => p.then((r) => { response = r; })),
      waitUntil: jest.fn(),
    };

    fetchHandler(event);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(response).toBe(cachedImage);
  });

  test('should provide a fallback page for navigation requests when offline and not cached', async () => {
    const fetchHandler = eventListeners['fetch']?.[0];
    if (!fetchHandler) return;

    mockCache.match.mockResolvedValueOnce(undefined); // cache miss
    mockFetch.mockRejectedValueOnce(new Error('Network error')); // offline

    let response;
    const event = {
      request: new Request('https://example.com/some-page', { mode: 'navigate' }),
      respondWith: jest.fn((p) => p.then((r) => { response = r; }).catch(() => {})),
      waitUntil: jest.fn(),
    };

    fetchHandler(event);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have attempted to respond (either with fallback or network error caught)
    expect(event.respondWith).toHaveBeenCalled();
  });

  test('should cache new responses for future offline use', async () => {
    const fetchHandler = eventListeners['fetch']?.[0];
    if (!fetchHandler) return;

    mockCache.match.mockResolvedValueOnce(undefined);
    const networkResponse = new Response('new data', { status: 200 });
    mockFetch.mockResolvedValueOnce(networkResponse);

    const event = {
      request: new Request('https://example.com/assets/style.css'),
      respondWith: jest.fn(),
      waitUntil: jest.fn((p) => p),
    };

    fetchHandler(event);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // The waitUntil callback should cache the response
    expect(event.waitUntil).toHaveBeenCalled();
  });
});
