const storage = require('../../src/storage/gameStorage');
const mockLogger = require('../mocks/mockLogger');

jest.mock('../../src/logging/logger', () => mockLogger);

describe('TRIOFSND-47: Storage integration emits structured logs', () => {
  beforeEach(() => {
    mockLogger.reset();
    jest.clearAllMocks();
  });

  it('emits best_score_updated when a new best score is persisted', async () => {
    await storage.saveBestScore(2000);
    await storage.saveBestScore(2500);

    const updateLogs = mockLogger.info.mock.calls
      .map((call) => call[0])
      .filter((entry) => entry.event === 'best_score_updated');

    expect(updateLogs).toHaveLength(2);
    expect(updateLogs[1]).toEqual(
      expect.objectContaining({
        event: 'best_score_updated',
        new_best: 2500,
        previous_best: 2000,
        app_version: expect.any(String),
      })
    );
  });

  it('emits storage_failure when the underlying storage throws', async () => {
    jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        const err = new Error('quota');
        err.name = 'QuotaExceededError';
        throw err;
      });

    await expect(storage.saveBestScore(9999)).rejects.toThrow();

    const failureLogs = mockLogger.error.mock.calls
      .map((call) => call[0])
      .filter((entry) => entry.event === 'storage_failure');

    expect(failureLogs).toHaveLength(1);
    expect(failureLogs[0]).toEqual(
      expect.objectContaining({
        event: 'storage_failure',
        operation: 'save',
        error_type: 'QuotaExceededError',
        app_version: expect.any(String),
      })
    );
  });

  it('never includes PII in any emitted log across a full save cycle', async () => {
    await storage.saveBestScore(100);

    const allLogs = [
      ...mockLogger.info.mock.calls.map((c) => c[0]),
      ...mockLogger.error.mock.calls.map((c) => c[0]),
    ];

    const serialized = JSON.stringify(allLogs);
    const piiPatterns = [
      /email/i,
      /userId/i,
      /username/i,
      /player_?id/i,
      /phone/i,
      /address/i,
    ];

    allLogs.forEach((entry) => {
      piiPatterns.forEach((pattern) => {
        const keys = Object.keys(entry);
        keys.forEach((key) => {
          expect(key).not.toMatch(pattern);
        });
      });
    });

    expect(serialized).not.toMatch(/@[\\w.-]+\\.[a-z]{2,}/i);
  });
});
