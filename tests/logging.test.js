const logger = require('../src/logger');
const gameService = require('../src/gameService');

jest.mock('../src/logger');

describe('TRIOFSND-47: Structured Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Best Score Events', () => {
    it('should emit structured log for best_score_updated', () => {
      const newBest = 150;
      const previousBest = 100;
      const appVersion = '1.2.3';

      gameService.updateBestScore(newBest, previousBest, appVersion);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'best_score_updated',
          new_best: newBest,
          previous_best: previousBest,
          app_version: appVersion
        })
      );
    });

    it('should not emit best_score_updated if score is not a new best', () => {
      gameService.updateBestScore(50, 100, '1.2.3');

      const bestScoreLogs = logger.info.mock.calls.filter(
        call => call[0]?.event === 'best_score_updated'
      );
      expect(bestScoreLogs.length).toBe(0);
    });

    it('should not include PII in best_score_updated log', () => {
      gameService.updateBestScore(150, 100, '1.2.3', { username: 'player1', email: 'test@test.com' });

      const logCall = logger.info.mock.calls.find(
        call => call[0]?.event === 'best_score_updated'
      );
      
      expect(logCall).toBeDefined();
      const logPayload = logCall[0];
      expect(JSON.stringify(logPayload)).not.toMatch(/player1|test@test.com/);
      expect(logPayload).not.toHaveProperty('username');
      expect(logPayload).not.toHaveProperty('email');
    });
  });

  describe('Storage Failure Events', () => {
    it('should emit structured log for storage_failure', () => {
      const operation = 'save_game';
      const error = new Error('QuotaExceededError');
      const appVersion = '1.2.3';

      gameService.handleStorageFailure(operation, error, appVersion);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'storage_failure',
          operation: operation,
          error_type: error.name,
          app_version: appVersion
        })
      );
    });

    it('should not include PII in storage_failure log', () => {
      const operation = 'save_game';
      const error = new Error('QuotaExceededError');
      const appVersion = '1.2.3';
      const userData = { userId: '12345', ip: '192.168.1.1' };

      gameService.handleStorageFailure(operation, error, appVersion, userData);

      const logCall = logger.error.mock.calls.find(
        call => call[0]?.event === 'storage_failure'
      );

      expect(logCall).toBeDefined();
      const logPayload = logCall[0];
      expect(JSON.stringify(logPayload)).not.toMatch(/12345|192.168.1.1/);
      expect(logPayload).not.toHaveProperty('userId');
      expect(logPayload).not.toHaveProperty('ip');
    });
  });
});