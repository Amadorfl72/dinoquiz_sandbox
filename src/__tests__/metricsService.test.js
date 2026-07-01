import { sendGameStartedMetric } from '../services/metricsService';
import { post } from '../services/apiService';

jest.mock('../services/apiService');

describe('metricsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call POST /metrics with game_started event', async () => {
    await sendGameStartedMetric();
    expect(post).toHaveBeenCalledWith('/metrics', { event: 'game_started' });
  });

  it('should handle errors gracefully', async () => {
    post.mockRejectedValue(new Error('Network error'));
    await sendGameStartedMetric();
    expect(post).toHaveBeenCalled();
  });
});