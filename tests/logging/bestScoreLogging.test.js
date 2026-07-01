const { updateBestScore } = require('../../src/scoreManager');
const logger = require('../../src/logger');

jest.mock('../../src/logger');

const APP_VERSION = '1.2.3';

describe('TRIOFSND-47: Structured logging for best score updates', () => {
  let storageMock;

  beforeEach(() => {
    jest.clearAllMocks();
    storageMock = {
      getBestScore: jest.fn(),
      setBestScore: jest.fn(),
    };
  });

  it('emits best_score_updated with new_best, previous_best, and app_version when a new best is achieved', async () => {
    storageMock.getBestScore.mockResolvedValue(50);
    storageMock.setBestScore.mockResolvedValue(true);

    await updateBestScore(75, { storage: storageMock, appVersion: APP_VERSION });

    expect(logger.info).toHaveBeenCalledWith({
      event: 'best_score_updated',
      new_best: 75,
      previous_best: 50,
      app_version: APP_VERSION,
    });
  });

  it('does not emit best_score_updated when the new score does not exceed the previous best', async () => {
    storageMock.getBestScore.mockResolvedValue(100);
    storageMock.setBestScore.mockResolvedValue(false);

    await updateBestScore(80, { storage: storageMock, appVersion: APP_VERSION });

    const bestScoreLogs = logger.info.mock.calls.filter(
      ([entry]) => entry && entry.event === 'best_score_updated'
    );
    expect(bestScoreLogs).toHaveLength(0);
  });

  it('uses previous_best of null when no previous best exists', async () => {
    storageMock.getBestScore.mockResolvedValue(null);
    storageMock.setBestScore.mockResolvedValue(true);

    await updateBestScore(10, { storage: storageMock, appVersion: APP_VERSION });

    expect(logger.info).toHaveBeenCalledWith({
      event: 'best_score_updated',
      new_best: 10,
      previous_best: null,
      app_version: APP_VERSION,
    });
  });

  it('does not include PII in the best_score_updated log entry', async () => {
    storageMock.getBestScore.mockResolvedValue(5);
    storageMock.setBestScore.mockResolvedValue(true);

    await updateBestScore(20, {
      storage: storageMock,
      appVersion: APP_VERSION,
      userId: 'user-123',
      username: 'jane.doe@example.com',
    });

    const [logEntry] = logger.info.mock.calls.find(
      ([entry]) => entry.event === 'best_score_updated'
    );

    expect(logEntry).not.toHaveProperty('userId');
    expect(logEntry).not.toHaveProperty('username');
    expect(JSON.stringify(logEntry)).not.toContain('user-123');
    expect(JSON.stringify(logEntry)).not.toContain('jane.doe');
  });
});
