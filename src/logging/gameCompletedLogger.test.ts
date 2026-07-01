import { logGameCompleted } from './gameCompletedLogger';

describe('TRIOFSND-36: Client-Side game_completed Logging Utility', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should send a POST request with the correct payload to the backend endpoint', async () => {
    const payload = {
      score: 1500,
      duration_ms: 120000,
      app_version: '1.2.3',
    };

    await logGameCompleted(payload);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/logs/game_completed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'game_completed',
        score: payload.score,
        duration_ms: payload.duration_ms,
        app_version: payload.app_version,
      }),
    });
  });

  it('should throw an error if required fields are missing', async () => {
    const invalidPayload = {
      score: 100,
      duration_ms: 5000,
    } as any;

    await expect(logGameCompleted(invalidPayload)).rejects.toThrow('Missing required fields: app_version');
  });
});