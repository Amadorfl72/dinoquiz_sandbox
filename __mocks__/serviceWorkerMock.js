// Mock for Service Worker and Cache APIs
const cacheStore = new Map();

const mockCache = {
  match: jest.fn((request) => {
    const key = typeof request === 'string' ? request : request.url;
    return Promise.resolve(cacheStore.has(key) ? cacheStore.get(key) : undefined);
  }),
  put: jest.fn((request, response) => {
    const key = typeof request === 'string' ? request : request.url;
    cacheStore.set(key, response);
    return Promise.resolve();
  }),
  add: jest.fn((request) => {
    const key = typeof request === 'string' ? request : request.url;
    cacheStore.set(key, new Response(JSON.stringify({ cached: true })));
    return Promise.resolve();
  }),
  addAll: jest.fn((requests) => {
    requests.forEach((req) => {
      const key = typeof req === 'string' ? req : req.url;
      cacheStore.set(key, new Response(JSON.stringify({ cached: true })));
    });
    return Promise.resolve();
  }),
  delete: jest.fn((request) => {
    const key = typeof request === 'string' ? request : request.url;
    return Promise.resolve(cacheStore.delete(key));
  }),
  keys: jest.fn(() => Promise.resolve(Array.from(cacheStore.keys()))),
};

const mockCaches = {
  open: jest.fn((cacheName) => Promise.resolve(mockCache)),
  delete: jest.fn((cacheName) => Promise.resolve(true)),
  has: jest.fn((cacheName) => Promise.resolve(cacheStore.has(cacheName))),
  keys: jest.fn(() => Promise.resolve(['triofsnd-cache-v1'])),
  match: jest.fn((request) => Promise.resolve(cacheStore.get(typeof request === 'string' ? request : request.url))),
  _store: cacheStore,
  _reset: () => cacheStore.clear(),
};

global.caches = mockCaches;

// Mock ServiceWorker
const mockServiceWorker = {
  postMessage: jest.fn(),
  state: 'activated',
};

global.navigator = {
  ...global.navigator,
  serviceWorker: {
    register: jest.fn(() => Promise.resolve({
      scope: '/',
      active: mockServiceWorker,
      installing: null,
      waiting: null,
      update: jest.fn(() => Promise.resolve()),
      unregister: jest.fn(() => Promise.resolve(true)),
    })),
    getRegistration: jest.fn(() => Promise.resolve({
      scope: '/',
      active: mockServiceWorker,
    })),
    getRegistrations: jest.fn(() => Promise.resolve([])),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    controller: mockServiceWorker,
    ready: Promise.resolve({ active: mockServiceWorker }),
  },
};

// Mock Fetch
global.fetch = jest.fn((url) => {
  return Promise.resolve(new Response(JSON.stringify({ url, fetched: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }));
});

// Mock Response constructor if not available
if (!global.Response) {
  global.Response = class MockResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = new Map(Object.entries(init.headers || {}));
    }
    json() { return Promise.resolve(JSON.parse(this.body)); }
    text() { return Promise.resolve(this.body); }
    clone() { return new MockResponse(this.body, { status: this.status }); }
  };
}

// Mock Request constructor if not available
if (!global.Request) {
  global.Request = class MockRequest {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.mode = init.mode || 'cors';
    }
  };
}

module.exports = { mockCaches, mockServiceWorker };
