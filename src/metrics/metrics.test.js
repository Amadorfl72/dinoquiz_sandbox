const { initMetrics, trackGameStarted } = require('./metrics');

describe('TRIOFSND-14: Observability and Metrics Integration', () => {
  let mockPerformanceObserver;
  let mockObserve;
  let mockDisconnect;
  let originalAddEventListener;
  let mockAddEventListener;
  let originalFetch;

  beforeAll(() => {
    mockObserve = jest.fn();
    mockDisconnect = jest.fn();
    mockPerformanceObserver = jest.fn((callback) => ({
      observe: mockObserve,
      disconnect: mockDisconnect,
      callback
    }));
    global.PerformanceObserver = mockPerformanceObserver;

    originalAddEventListener = global.addEventListener;
    mockAddEventListener = jest.fn();
    global.addEventListener = mockAddEventListener;

    originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
  });

  afterAll(() => {
    global.PerformanceObserver = undefined;
    global.addEventListener = originalAddEventListener;
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LCP Latency Tracking', () => {
    it('should initialize PerformanceObserver for largest-contentful-paint', () => {
      initMetrics();
      expect(mockPerformanceObserver).toHaveBeenCalledTimes(1);
      expect(mockObserve).toHaveBeenCalledWith({ type: 'largest-contentful-paint', buffered: true });
    });

    it('should send LCP metric to backend when observed', async () => {
      initMetrics();
      
      const observerInstance = mockPerformanceObserver.mock.results[0].value;
      const entries = [{ startTime: 1234 }];
      observerInstance.callback(entries, mockPerformanceObserver());

      expect(global.fetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ metric: 'LCP', value: 1234 })
      }));
    });
  });

  describe('JS Error Rate Monitoring', () => {
    it('should add an event listener for global errors', () => {
      initMetrics();
      expect(mockAddEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should send error metric to backend when an error occurs', () => {
      initMetrics();
      const errorListener = mockAddEventListener.mock.calls.find(call => call[0] === 'error')[1];
      
      const mockErrorEvent = { message: 'Test error', filename: 'test.js', lineno: 10 };
      errorListener(mockErrorEvent);

      expect(global.fetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ metric: 'JS_ERROR', value: mockErrorEvent })
      }));
    });
  });

  describe('Game Started Metrics', () => {
    it('should send game_started metric to backend endpoint', async () => {
      await trackGameStarted({ userId: '123', gameId: 'chess' });

      expect(global.fetch).toHaveBeenCalledWith('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: 'game_started', userId: '123', gameId: 'chess' })
      });
    });
  });
});