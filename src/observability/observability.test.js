import { trackLCP, trackJSErrors, trackGameStarted } from '../utils/metrics';
import { sendMetric } from '../utils/api';

jest.mock('../utils/api', () => ({
  sendMetric: jest.fn(() => Promise.resolve({ ok: true }))
}));

describe('TRIOFSND-14: Observability and Metrics Integration', () => {
  let originalPerformanceObserver;
  let originalAddEventListener;

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
    global.window.addEventListener = jest.fn();
  });

  afterEach(() => {
    global.PerformanceObserver = originalPerformanceObserver;
    global.window.addEventListener = originalAddEventListener;
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
  });

  describe('JS Error Rate Monitoring', () => {
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
  });

  describe('Game Started Metrics', () => {
    it('should send game_started metric to the backend endpoint', () => {
      trackGameStarted();
      expect(sendMetric).toHaveBeenCalledWith('game_started', {
        timestamp: expect.any(String)
      });
    });
  });
});