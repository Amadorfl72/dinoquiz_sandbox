import { MetricsService } from './metrics';

describe('MetricsService', () => {
  let metricsService: MetricsService;
  let mockFetch: jest.Mock;
  let mockPerformanceObserver: any;
  let observerCallback: (list: any) => void;

  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch as any;

    // Mock PerformanceObserver
    observerCallback = () => {};
    mockPerformanceObserver = jest.fn().mockImplementation((cb) => {
      observerCallback = cb;
      return {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };
    });
    global.PerformanceObserver = mockPerformanceObserver as any;

    metricsService = new MetricsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('LCP Latency Tracking', () => {
    it('should observe largest-contentful-paint entries', () => {
      metricsService.trackLCP();
      expect(mockPerformanceObserver).toHaveBeenCalledTimes(1);
      expect(mockPerformanceObserver.mock.calls[0][1]).toEqual({ type: 'largest-contentful-paint', buffered: true });
    });

    it('should send LCP latency to backend when entry is recorded', () => {
      metricsService.trackLCP();
      
      const mockEntries = [
        { startTime: 2500, renderTime: 2550, loadTime: 2520, size: 5000, id: 'elem1' }
      ];
      
      observerCallback({ getEntries: () => mockEntries });

      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'lcp_latency',
          value: 2550,
          timestamp: expect.any(Number)
        })
      }));
    });
  });

  describe('JS Error Rate Monitoring', () => {
    it('should listen for global error events', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      metricsService.trackJSErrors();
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should send JS error details to backend when an error occurs', () => {
      metricsService.trackJSErrors();
      
      const mockErrorEvent = new ErrorEvent('error', {
        message: 'Unexpected token',
        filename: 'app.js',
        lineno: 42,
        colno: 10,
        error: new Error('Unexpected token')
      });
      
      window.dispatchEvent(mockErrorEvent);

      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'js_error',
          message: 'Unexpected token',
          source: 'app.js',
          line: 42,
          column: 10,
          timestamp: expect.any(Number)
        })
      }));
    });
  });

  describe('Game Started Metrics', () => {
    it('should send game_started metric to the backend endpoint', () => {
      metricsService.trackGameStarted();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'game_started',
          timestamp: expect.any(Number)
        })
      }));
    });
  });
});