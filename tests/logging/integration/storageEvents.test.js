const { saveBestScore, loadBestScore } = require('../../src/services/storage');
const { logStorageFailure } = require('../../src/utils/logging');

// Mock console.log to capture structured logs
const mockConsoleLog = jest.fn();
console.log = mockConsoleLog;

describe('TRIOFSND-47: Storage integration emits structured logs', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
    localStorage.clear();
  });

  it('emits storage_failure when the underlying storage throws', () => {
    jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        const err = new Error('quota');
        err.name = 'QuotaExceededError';
        throw err;
      });

    expect(saveBestScore(9999)).toBe(false);

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    
    expect(logged).toEqual(
      expect.objectContaining({
        event: 'storage_failure',
        operation: 'save',
        error_type: 'QuotaExceededError',
        app_version: expect.any(String),
      })
    );
  });

  it('never includes PII in any emitted log across a full save cycle', () => {
    saveBestScore(100);

    const allLogs = mockConsoleLog.mock.calls.map(call => JSON.parse(call[0]));
    
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

    expect(serialized).not.toMatch(/@[\w.-]+\.[a-z]{2,}/i);
  });
});