import { logGameCompleted } from '../analytics';

global.fetch = jest.fn(() => Promise.resolve({ ok: true }));

describe('logGameCompleted', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should send a POST request to the backend endpoint with the correct payload', async () => {
    const gameData = {
      score: 1500,
      duration_ms: 120000,
      app_version: '1.0.0'
    };

    await logGameCompleted(gameData);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/events',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'game_completed',
          score: gameData.score,
          duration_ms: gameData.duration_ms,
          app_version: gameData.app_version
        })
      })
    );
  });

  it('should not throw if fetch fails, but handle gracefully', async () => {
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error('API is down')));
    
    const gameData = {
      score: 0,
      duration_ms: 100,
      app_version: '1.0.0'
    };

    await expect(logGameCompleted(gameData)).resolves.not.toThrow();
  });
});