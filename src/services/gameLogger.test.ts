import { logGameCompleted } from '../logging';

global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200 })) as unknown as typeof fetch;

describe('TRIOFSND-36: Client-Side game_completed Logging', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should emit game_completed event with score, duration_ms, and app_version to the backend', async () => {
    const payload = {
      score: 1500,
      duration_ms: 120000,
      app_version: '1.2.3',
    };

    await logGameCompleted(payload.score, payload.duration_ms, payload.app_version);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      '/api/logs',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'game_completed',
          score: payload.score,
          duration_ms: payload.duration_ms,
          app_version: payload.app_version,
        }),
      })
    );
  });

  it('should not throw or crash the app if the logging endpoint fails', async () => {
    const payload = {
      score: 0,
      duration_ms: 5000,
      app_version: '1.2.3',
    };

    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    await expect(
      logGameCompleted(payload.score, payload.duration_ms, payload.app_version)
    ).resolves.not.toThrow();
  });
});
