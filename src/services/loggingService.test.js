const axios = require('axios');
jest.mock('axios');

const { logGameCompleted } = require('./loggingService');

describe('logGameCompleted', () => {
  beforeEach(() => {
    axios.post.mockClear();
  });

  it('should send a POST request with the correct structured payload', async () => {
    const payload = {
      event: 'game_completed',
      score: 100,
      duration_ms: 60000,
      app_version: '1.0.0'
    };
    axios.post.mockResolvedValue({ status: 200 });

    await logGameCompleted(100, 60000, '1.0.0');

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith('/api/logs', payload);
  });

  it('should handle network errors gracefully', async () => {
    axios.post.mockRejectedValue(new Error('Network Error'));
    
    // Should not throw unhandled rejection
    await expect(logGameCompleted(50, 30000, '1.0.1')).resolves.not.toThrow();
  });
});