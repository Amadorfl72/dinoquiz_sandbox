import { trackLCP, trackJSErrors, trackGameStarted } from '../utils/metrics';
import { sendMetric } from '../utils/api';

jest.mock('../utils/api', () => ({
  sendMetric: jest.fn(() => Promise.resolve({ ok: true }))
}));

describe('TRIOFSND-14: Observability and Metrics Integration', () => {
  let originalPerformanceObserver;
  let originalAddEventListener;
  let originalOnerror;

  beforeEach(() => {
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
    originalOnerror = global.window.onerror;
    global.window.addEventListener = jest.fn();
    global.window.onerror = undefined;
  });

  afterEach(() => {
    global.PerformanceObserver = originalPerformanceObserver;
    global.window.addEventListener = originalAddEventListener;
    global.window.onerror = originalOnerror;
    jest.clearAllMocks();
  });

  describe('LCP Latency Tracking', () => {
    it('should initialize PerformanceObserver for LCP', () => {
      trackLCP();
      expect(global.PerformanceObserver).toHaveBeenCalled();
      const instance = global.PerformanceObserver.mock.instances[0];
      expect(instance.observe).toHaveBeenCalledWith({ type: 'largest-contentful-paint', buffered: true });
    });

    it('should track LCP latency when entry is recorded', () => {
      trackLCP();
      const lcpEntry = { startTime: 2500, size: 5000, entryType: 'largest-contentful-paint' };
      
      // Simulate performance observer callback
      global.PerformanceObserver.mockCallback({
        getEntries: () => [lcpEntry]
      });

      expect(sendMetric).toHaveBeenCalledWith('lcp_latency', 2500);
    });

    it('should use the last entry when multiple LCP entries are recorded', () => {
      trackLCP();
      const entries = [
        { startTime: 1200, size: 1000, entryType: 'largest-contentful-paint' },
        { startTime: 3000, size: 5000, entryType: 'largest-contentful-paint' },
        { startTime: 4500, size: 8000, entryType: 'largest-contentful-paint' }
      ];

      global.PerformanceObserver.mockCallback({
        getEntries: () => entries
      });

      expect(sendMetric).toHaveBeenCalledWith('lcp_latency', 4500);
    });

    it('should create exactly one PerformanceObserver per trackLCP call', () => {
      trackLCP();
      trackLCP();
      expect(global.PerformanceObserver).toHaveBeenCalledTimes(2);
    });
  });

  describe('JS Error Rate Monitoring', () => {
    it('should set window.onerror handler when trackJSErrors is called', () => {
      expect(global.window.onerror).toBeUndefined();
      trackJSErrors();
      expect(typeof global.window.onerror).toBe('function');
    });

    it('should track JS errors when an error event is fired', () => {
      trackJSErrors();
      const error = new Error('Test error');
      window.onerror('Test error', 'test.js', 10, 5, error);

      expect(sendMetric).toHaveBeenCalledWith('js_error_rate', {
        message: 'Test error',
        source: 'test.js',
        lineno: 10,
        colno: 5,
        error: error
      });
    });

    it('should handle errors without an Error object', () => {
      trackJSErrors();
      window.onerror('Something went wrong', 'app.js', 42, 1, null);

      expect(sendMetric).toHaveBeenCalledWith('js_error_rate', {
        message: 'Something went wrong',
        source: 'app.js',
        lineno: 42,
        colno: 1,
        error: null
      });
    });

    it('should send a metric each time an error is fired', () => {
      trackJSErrors();
      window.onerror('Error 1', 'a.js', 1, 1, null);
      window.onerror('Error 2', 'b.js', 2, 2, null);

      expect(sendMetric).toHaveBeenCalledTimes(2);
    });
  });

  describe('Game Started Metrics', () => {
    it('should send game_started metric to the backend endpoint', () => {
      trackGameStarted();
      expect(sendMetric).toHaveBeenCalledWith('game_started', {
        timestamp: expect.any(String)
      });
    });

    it('should send a valid ISO timestamp string', () => {
      trackGameStarted();
      const callArgs = sendMetric.mock.calls[0];
      const timestamp = callArgs[1].timestamp;
      const parsed = new Date(timestamp);
      expect(parsed.toString()).not.toBe('Invalid Date');
      expect(parsed.toISOString()).toBe(timestamp);
    });

    it('should call sendMetric exactly once per trackGameStarted call', () => {
      trackGameStarted();
      trackGameStarted();
      expect(sendMetric).toHaveBeenCalledTimes(2);
    });
  });
});
