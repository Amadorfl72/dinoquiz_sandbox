import { logGameCompleted } from './gameCompletedLogger';

describe('TRIOFSND-36: logGameCompleted', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('emits game_completed event with score, duration_ms, and app_version to the backend endpoint', async () => {
    const payload = {
      score: 1500,
      duration_ms: 120000,
      app_version: '1.0.0',
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });

    await logGameCompleted(payload);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'game_completed',
          score: 1500,
          duration_ms: 120000,
          app_version: '1.0.0',
        }),
      })
    );
  });

  it('does not throw if the backend endpoint fails', async () => {
    const payload = {
      score: 0,
      duration_ms: 5000,
      app_version: '1.0.0',
    };

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(logGameCompleted(payload)).resolves.not.toThrow();
  });
});