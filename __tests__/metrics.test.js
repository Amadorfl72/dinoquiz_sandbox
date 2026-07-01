describe('TRIOFSND-14: Observability and Metrics Integration', () => {
  let mockFetch;
  let metricsService;

  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
    
    // Mock PerformanceObserver
    global.PerformanceObserver = jest.fn().mockImplementation((callback) => {
      return {
        observe: jest.fn(),
        disconnect: jest.fn(),
        _callback: callback
      };
    });
    
    // Mock window event listeners
    window.addEventListener = jest.fn();

    // Dynamically require to ensure mocks are in place
    const { MetricsService } = require('../src/metricsService');
    metricsService = new MetricsService();
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  describe('LCP Latency Tracking', () => {
    test('should initialize PerformanceObserver for LCP', () => {
      expect(global.PerformanceObserver).toHaveBeenCalled();
      const observerInstance = global.PerformanceObserver.mock.instances[0];
      expect(observerInstance.observe).toHaveBeenCalledWith({ entryTypes: ['largest-contentful-paint'] });
    });

    test('should send LCP metric to backend when observed', () => {
      const lcpEntry = { startTime: 2500, loadTime: 0 };
      // Simulate the callback passed to PerformanceObserver
      const callback = global.PerformanceObserver.mock.calls[0][0];
      callback({
        getEntries: () => [lcpEntry]
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ metric: 'LCP', value: 2500 })
      }));
    });
  });

  describe('JS Error Rate Monitoring', () => {
    test('should attach error event listener to window', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should send JS error metric to backend when an error occurs', () => {
      const errorHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      const mockErrorEvent = {
        message: 'Uncaught TypeError: undefined is not a function',
        filename: 'app.js',
        lineno: 42,
        colno: 10,
        error: new Error('Test error')
      };

      errorHandler(mockErrorEvent);

      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          metric: 'JS_ERROR',
          payload: {
            message: mockErrorEvent.message,
            source: mockErrorEvent.filename,
            line: mockErrorEvent.lineno,
            col: mockErrorEvent.colno
          }
        })
      }));
    });
  });

  describe('Game Started Metric', () => {
    test('should send game_started metric to backend endpoint', async () => {
      await metricsService.trackGameStarted();

      expect(mockFetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ event: 'game_started' })
      }));
    });
  });
});