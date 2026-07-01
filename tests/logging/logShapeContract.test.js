const { updateBestScore } = require('../../src/scoreManager');
const logger = require('../../src/logger');

jest.mock('../../src/logger');

const APP_VERSION = '2.0.0';

describe('TRIOFSND-47: Log entry shape contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('best_score_updated contains exactly the required fields', async () => {
    const storageMock = {
      getBestScore: jest.fn().mockResolvedValue(1),
      setBestScore: jest.fn().mockResolvedValue(true),
    };

    await updateBestScore(2, { storage: storageMock, appVersion: APP_VERSION });

    const [entry] = logger.info.mock.calls.find(
      ([e]) => e.event === 'best_score_updated'
    );

    expect(Object.keys(entry).sort()).toEqual(
      ['app_version', 'event', 'new_best', 'previous_best'].sort()
    );
  });

  it('storage_failure contains exactly the required fields', async () => {
    const error = new Error('boom');
    error.code = 'EIO';
    const storageMock = {
      getBestScore: jest.fn().mockRejectedValue(error),
      setBestScore: jest.fn(),
    };

    await expect(
      updateBestScore(2, { storage: storageMock, appVersion: APP_VERSION })
    ).rejects.toThrow();

    const [entry] = logger.error.mock.calls.find(
      ([e]) => e.event === 'storage_failure'
    );

    expect(Object.keys(entry).sort()).toEqual(
      ['app_version', 'error_type', 'event', 'operation'].sort()
    );
  });
});
