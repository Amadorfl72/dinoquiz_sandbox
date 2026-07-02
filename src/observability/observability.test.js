import { initObservability, trackGameStarted, getMetrics } from './observability';

describe('TRIOFSND-14: Observability and Metrics Integration', () => {
  let mockFetch;
  let originalPerformanceObserver;
  let originalAddEventListener;

  beforeEach(() => {
    mockFetch = jest.fn(() => Promise.resolve({ ok: true }));
    global.fetch = mockFetch;

    // Mock PerformanceObserver
    originalPerformanceObserver = global.PerformanceObserver;
    global.PerformanceObserver = jest.fn(function(callback) {
      this.observe = jest.fn();
      this.disconnect = jest.fn();
      // Store callback to trigger it manually in tests
      global.PerformanceObserver.mockCallback = callback;
    });

    // Mock window
    global.window = global.window || {};
    originalAddEventListener = global.window.addEventListener;
    global.window.addEventListener = jest.fn();
  });

  afterEach(() => {
    global.PerformanceObserver = originalPerformanceObserver;
    global.window.addEventListener = originalAddEventListener;
    jest.clearAllMocks();
  });

  describe('LCP Latency Tracking', () => {
    it('should initialize PerformanceObserver for LCP', () => {
      initObservability();
      expect(global.PerformanceObserver).toHaveBeenCalled();
      const instance = global.PerformanceObserver.mock.instances[0];
      expect(instance.observe).toHaveBeenCalledWith({ entryTypes: ['largest-contentful-paint'] });
    });

    it('should track LCP latency when entry is recorded', () => {
      initObservability();
      const lcpEntry = { startTime: 2500, renderTime: 2500, loadTime: 2500, size: 5000, entryType: 'largest-contentful-paint' };
      
      // Simulate performance observer callback
      global.PerformanceObserver.mockCallback({
        getEntries: () => [lcpEntry]
      });

      const metrics = getMetrics();
      expect(metrics.lcp).toBe(2500);
    });
  });

  describe('JS Error Rate Monitoring', () => {
    it('should attach an error event listener to the window', () => {
      initObservability();
      expect(global.window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should track JS errors when an error event is fired', () => {
      initObservability();
      const errorListener = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      // Simulate an error event
      errorListener({ message: 'Test error', filename: 'test.js', lineno: 10, colno: 5, error: new Error('Test') });

      const metrics = getMetrics();
      expect(metrics.jsErrorCount).toBe(1);
      expect(metrics.jsErrors[0].message).toBe('Test error');
    });
  });

  describe('Game Started Metrics', () => {
    it('should send game_started metric to the backend endpoint', async () => {
      initObservability();
      await trackGameStarted({ gameId: '12345', userId: 'user1' });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/metrics');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        event: 'game_started',
        gameId: '12345',
        userId: 'user1',
        timestamp: expect.any(Number)
      });
    });
  });
});