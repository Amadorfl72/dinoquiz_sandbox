import { trackLCP, trackJSErrors, sendGameStartedMetric } from './metrics';

describe('TRIOFSND-14: Observability and Metrics Integration', () => {
  let mockFetch;
  let mockPerformanceObserverInstance;
  let originalPerformanceObserver;

  beforeEach(() => {
    mockFetch = jest.fn(() => Promise.resolve({ ok: true }));
    global.fetch = mockFetch;

    mockPerformanceObserverInstance = {
      observe: jest.fn(),
      disconnect: jest.fn()
    };
    
    global.PerformanceObserver = jest.fn((callback) => {
      mockPerformanceObserverInstance.callback = callback;
      return mockPerformanceObserverInstance;
    });

    global.window = global.window || {};
    global.window.addEventListener = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('LCP latency tracking', () => {
    it('should observe largest-contentful-paint and send latency to backend', () => {
      trackLCP();
      
      expect(global.PerformanceObserver).toHaveBeenCalled();
      expect(mockPerformanceObserverInstance.observe).toHaveBeenCalledWith({ 
        type: 'largest-contentful-paint', 
        buffered: true 
      });

      const entries = [{ startTime: 1234.5, entryType: 'largest-contentful-paint' }];
      mockPerformanceObserverInstance.callback(entries, mockPerformanceObserverInstance);

      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          metric: 'LCP',
          value: 1234.5
        })
      }));
    });
  });

  describe('JS error rate monitoring', () => {
    it('should listen for window errors and send error data to backend', () => {
      trackJSErrors();
      
      expect(global.window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));

      const errorHandler = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      
      const mockErrorEvent = {
        message: 'Uncaught TypeError: x is not a function',
        filename: 'app.js',
        lineno: 10,
        colno: 20,
        error: new Error('Test error')
      };
      
      errorHandler(mockErrorEvent);

      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          metric: 'JS_ERROR',
          message: 'Uncaught TypeError: x is not a function',
          source: 'app.js',
          line: 10,
          column: 20
        })
      }));
    });
  });

  describe('game_started metrics', () => {
    it('should send game_started metric to the backend endpoint', () => {
      sendGameStartedMetric();

      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          metric: 'game_started',
          timestamp: expect.any(Number)
        })
      }));
    });
  });
});