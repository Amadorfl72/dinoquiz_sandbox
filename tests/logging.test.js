const logger = require('../src/logger');
const scoreService = require('../src/scoreService');

jest.mock('../src/logger');

describe('TRIOFSND-47: Structured logging for best score and storage events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('best_score_updated event', () => {
    it('should emit structured log when best score is updated', () => {
      const newBest = 150;
      const previousBest = 100;
      const appVersion = '1.2.3';

      scoreService.updateBestScore(newBest, previousBest, appVersion);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'best_score_updated',
          new_best: newBest,
          previous_best: previousBest,
          app_version: appVersion
        })
      );
    });

    it('should not include PII in the best_score_updated log', () => {
      const newBest = 150;
      const previousBest = 100;
      const appVersion = '1.2.3';
      const userContext = { userId: 'user-123', email: 'test@example.com' };

      scoreService.updateBestScore(newBest, previousBest, appVersion, userContext);

      const logCall = logger.info.mock.calls[0][0];
      const logString = JSON.stringify(logCall);
      
      expect(logCall).not.toHaveProperty('userId');
      expect(logCall).not.toHaveProperty('email');
      expect(logString).not.toContain('user-123');
      expect(logString).not.toContain('test@example.com');
    });
  });

  describe('storage_failure event', () => {
    it('should emit structured log when storage operation fails', async () => {
      const operation = 'save_score';
      const error = new Error('QuotaExceededError');
      const appVersion = '1.2.3';

      // Mocking the internal storage call to throw an error
      jest.spyOn(scoreService, 'persistScore').mockRejectedValueOnce(error);

      await expect(scoreService.saveScore(150, appVersion)).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'storage_failure',
          operation: operation,
          error_type: error.name,
          app_version: appVersion
        })
      );
    });

    it('should not include PII in the storage_failure log', async () => {
      const operation = 'save_score';
      const error = new Error('NetworkError');
      const appVersion = '1.2.3';
      const userContext = { userId: 'user-456', email: 'test@example.com' };

      jest.spyOn(scoreService, 'persistScore').mockRejectedValueOnce(error);

      await expect(scoreService.saveScore(150, appVersion, userContext)).rejects.toThrow();

      const logCall = logger.error.mock.calls[0][0];
      const logString = JSON.stringify(logCall);

      expect(logCall).not.toHaveProperty('userId');
      expect(logCall).not.toHaveProperty('email');
      expect(logString).not.toContain('user-456');
      expect(logString).not.toContain('test@example.com');
    });
  });
});
