const mockCache = {
  _store: new Map(),
  put: jest.fn(async (request, response) => {
    mockCache._store.set(request.url || request, response);
    return undefined;
  }),
  match: jest.fn(async (request) => {
    return mockCache._store.get(request.url || request) || undefined;
  }),
  add: jest.fn(async (request) => {
    const response = new Response(new ArrayBuffer(1024), { status: 200 });
    mockCache._store.set(request.url || request, response);
    return undefined;
  }),
  addAll: jest.fn(async (requests) => {
    for (const req of requests) {
      const response = new Response(new ArrayBuffer(1024), { status: 200 });
      mockCache._store.set(req.url || req, response);
    }
    return undefined;
  }),
  delete: jest.fn(async (request) => {
    return mockCache._store.delete(request.url || request);
  }),
  keys: jest.fn(async () => {
    return Array.from(mockCache._store.keys()).map((url) => new Request(url));
  }),
};

const mockCaches = {
  open: jest.fn(async (cacheName) => {
    mockCache.name = cacheName;
    return mockCache;
  }),
  delete: jest.fn(async () => true),
  has: jest.fn(async () => true),
  keys: jest.fn(async () => ['triofsnd-cache-v1']),
  match: jest.fn(async () => undefined),
};

const mockClients = {
  claim: jest.fn(async () => undefined),
  matchAll: jest.fn(async () => []),
};

const mockSkipWaiting = jest.fn();

const eventListeners = {};

const mockFetch = jest.fn(async (request) => {
  const url = typeof request === 'string' ? request : request.url;
  if (url.includes('questions.json')) {
    return new Response(JSON.stringify({ questions: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg')) {
    return new Response(new ArrayBuffer(4096), {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  }
  if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg') || url.includes('.webp')) {
    return new Response(new ArrayBuffer(2048), {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    });
  }
  return new Response('<html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
});

global.caches = mockCaches;
global.clients = mockClients;
global.skipWaiting = mockSkipWaiting;
global.fetch = mockFetch;

global.self = {
  addEventListener: jest.fn((event, handler) => {
    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(handler);
  }),
  skipWaiting: mockSkipWaiting,
  clients: mockClients,
  caches: mockCaches,
  registration: {
    showNotification: jest.fn(async () => undefined),
  },
};

global.caches._mockCache = mockCache;
global._eventListeners = eventListeners;

global.Response = Response;
global.Request = Request;
global.Headers = Headers;

module.exports = { mockCache, mockCaches, eventListeners, mockFetch };
