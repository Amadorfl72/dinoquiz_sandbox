import { logGameCompleted } from '../logging';

global.fetch = jest.fn(() => Promise.resolve({ ok: true }));

describe('gameLogger', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should send game_completed event with score, duration_ms, and app_version to the backend endpoint', async () => {
    const gameData = {
      score: 1500,
      duration_ms: 120000,
      app_version: '1.2.3',
    };

    await logGameCompleted(gameData.score, gameData.duration_ms, gameData.app_version);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/logs'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          event: 'game_completed',
          score: 1500,
          duration_ms: 120000,
          app_version: '1.2.3',
        }),
      })
    );
  });
});
