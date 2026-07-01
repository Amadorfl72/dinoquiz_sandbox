import { trackLCP, trackJSError, trackGameStarted } from '../utils/metrics';

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

      trackLCP(2500);
      
      expect(fetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"event":"lcp_latency"')
      }));
    });
  });

  describe('JS Error Rate Monitoring', () => {
    it('should track JS errors and send metric', () => {
      const error = new Error('Test error');
      trackJSError(error);

      expect(fetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"event":"js_error"')
      }));
    });
  });

  describe('Game Started Metrics', () => {
    it('should send game_started metric to backend', () => {
      trackGameStarted();

      expect(fetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"event":"game_started"')
      }));
    });
  });
});