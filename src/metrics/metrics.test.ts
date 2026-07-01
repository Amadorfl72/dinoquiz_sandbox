import { trackLCP, trackJSErrors, sendGameStartedMetric } from './metrics';

global.fetch = jest.fn(() => Promise.resolve(new Response('{}', { status: 200 }))) as jest.Mock;

describe('TRIOFSND-14: Observability and Metrics Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LCP Latency Tracking', () => {
    it('should track LCP and send metric', () => {
      const observeMock = jest.fn();
      const disconnectMock = jest.fn();
      global.PerformanceObserver = jest.fn().mockImplementation((cb) => {
        return {
          observe: observeMock,
          disconnect: disconnectMock,
        };
      }) as any;

      trackLCP();
      expect(observeMock).toHaveBeenCalledWith({ entryTypes: ['largest-contentful-paint'] });
      
      const observerCallback = (global.PerformanceObserver as jest.Mock).mock.calls[0][0];
      observerCallback({
        getEntries: () => [{ startTime: 2500 }]
      });

      expect(fetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"metric":"LCP"')
      }));
    });
  });

  describe('JS Error Rate Monitoring', () => {
    it('should track JS errors and send metric', () => {
      const errorEvent = new Event('error');
      Object.defineProperty(errorEvent, 'message', { value: 'Test error' });
      
      trackJSErrors();
      window.dispatchEvent(errorEvent);

      expect(fetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"metric":"JS_ERROR"')
      }));
    });
  });

  describe('Game Started Metrics', () => {
    it('should send game_started metric to backend', async () => {
      await sendGameStartedMetric();

      expect(fetch).toHaveBeenCalledWith('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: 'game_started', timestamp: expect.any(Number) })
      });
    });
  });
});