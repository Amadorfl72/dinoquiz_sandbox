import { logGameCompleted } from '../../logging';

global.fetch = jest.fn(() => Promise.resolve({ ok: true }));

describe('logGameCompleted', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should send a POST request to the backend endpoint with the correct payload', async () => {
    const gameData = {
      score: 1500,
      duration_ms: 120000,
      app_version: '1.0.0',
    };

    await logGameCompleted(gameData.score, gameData.duration_ms, gameData.app_version);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/logs',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'game_completed',
          score: gameData.score,
          duration_ms: gameData.duration_ms,
          app_version: gameData.app_version,
        }),
      })
    );
  });

  it('should not throw if fetch fails, but handle gracefully', async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.reject(new Error('API is down'))
    );

    const gameData = {
      score: 0,
      duration_ms: 100,
      app_version: '1.0.0',
    };

    await expect(
      logGameCompleted(gameData.score, gameData.duration_ms, gameData.app_version)
    ).resolves.not.toThrow();
  });

  it('should not throw if backend responds with non-OK status', async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 500 })
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      logGameCompleted(100, 5000, '1.0.0')
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
