import { logGameCompleted } from './gameLogger';
import { apiClient } from './apiClient';

jest.mock('./apiClient');

describe('TRIOFSND-36: Client-Side game_completed Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should emit game_completed event with score, duration_ms, and app_version to the backend', async () => {
    const payload = {
      score: 1500,
      duration_ms: 120000,
      app_version: '1.2.3',
    };

    await logGameCompleted(payload);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith('/api/logs', {
      event: 'game_completed',
      ...payload,
    });
  });

  it('should not throw or crash the app if the logging endpoint fails', async () => {
    const payload = {
      score: 0,
      duration_ms: 5000,
      app_version: '1.2.3',
    };

    (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    await expect(logGameCompleted(payload)).resolves.not.toThrow();
  });
});