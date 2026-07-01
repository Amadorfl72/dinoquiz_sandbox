import { trackLcpLatency, trackJsErrors, sendGameStartedMetric } from './metrics';

describe('TRIOFSND-14: Observability and Metrics Integration', () => {
  let mockFetch: jest.Mock;
  let performanceObserverCallback: (list: any) => void;

  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch as any;

    // Mock PerformanceObserver
    performanceObserverCallback = () => {};
    global.PerformanceObserver = jest.fn().mockImplementation((callback) => {
      performanceObserverCallback = callback;
      return {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };
    }) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendGameStartedMetric', () => {
    it('should send a POST request with game_started metric to the backend', async () => {
      await sendGameStartedMetric();
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'game_started', timestamp: expect.any(Number) })
      }));
    });
  });

  describe('trackLcpLatency', () => {
    it('should track LCP and send metric to backend when LCP event occurs', () => {
      trackLcpLatency();
      
      const mockEntries = [
        { startTime: 1234, renderTime: 1250, loadTime: 0, element: 'div', entryType: 'largest-contentful-paint' }
      ];
      const mockList = {
        getEntries: () => mockEntries
      };
      
      performanceObserverCallback(mockList);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ event: 'lcp_latency', value: 1250, timestamp: expect.any(Number) })
      }));
    });
  });

  describe('trackJsErrors', () => {
    it('should track JS errors and send metric to backend on unhandled error', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      trackJsErrors();
      
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Test error')
      });

      const errorCall = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'error'
      );
      expect(errorCall).toBeDefined();
      
      const handler = errorCall![1] as EventListener;
      handler(errorEvent);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ 
          event: 'js_error', 
          message: 'Test error', 
          source: 'test.js', 
          lineno: 10, 
          colno: 5,
          timestamp: expect.any(Number) 
        })
      }));
    });
  });
});