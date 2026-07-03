const scoreService = require('../scoreService');
const logger = require('../../utils/logger');
const config = require('../../config');

jest.mock('../../utils/logger');
jest.mock('../../config', () => ({
  appVersion: '1.4.2',
}));

describe('TRIOFSND-47: scoreService structured logging for best score', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('best_score_updated event', () => {
    it('logs best_score_updated when a new best score is achieved', () => {
      const previousBest = 1200;
      const newBest = 1500;

      scoreService.updateBestScore(newBest, previousBest);

      expect(logger.logStructured).toHaveBeenCalledTimes(1);
      const logged = logger.logStructured.mock.calls[0][0];

      expect(logged).toEqual({
        event: 'best_score_updated',
        new_best: newBest,
        previous_best: previousBest,
        app_version: '1.4.2',
      });
    });

    it('does not log best_score_updated when the new score is not greater than previous best', () => {
      scoreService.updateBestScore(1000, 1200);

      expect(logger.logStructured).not.toHaveBeenCalled();
    });

    it('does not log best_score_updated when the new score equals the previous best', () => {
      scoreService.updateBestScore(1200, 1200);

      expect(logger.logStructured).not.toHaveBeenCalled();
    });

    it('logs best_score_updated when previous best is null (first score)', () => {
      scoreService.updateBestScore(500, null);

      expect(logger.logStructured).toHaveBeenCalledTimes(1);
      const logged = logger.logStructured.mock.calls[0][0];

      expect(logged).toEqual({
        event: 'best_score_updated',
        new_best: 500,
        previous_best: null,
        app_version: '1.4.2',
      });
    });

    it('logs best_score_updated when previous best is undefined (first score)', () => {
      scoreService.updateBestScore(500, undefined);

      expect(logger.logStructured).toHaveBeenCalledTimes(1);
      const logged = logger.logStructured.mock.calls[0][0];

      expect(logged).toEqual({
        event: 'best_score_updated',
        new_best: 500,
        previous_best: undefined,
        app_version: '1.4.2',
      });
    });

    it('does not include any PII fields in the best_score_updated log entry', () => {
      scoreService.updateBestScore(1500, 1200);

      const logged = logger.logStructured.mock.calls[0][0];
      const piiFields = ['userId', 'user_id', 'username', 'email', 'ip', 'device_id', 'name', 'phone'];

      piiFields.forEach((field) => {
        expect(logged).not.toHaveProperty(field);
      });
      expect(Object.keys(logged).sort()).toEqual(
        ['app_version', 'event', 'new_best', 'previous_best'].sort()
      );
    });

    it('includes the current app_version from config in the log entry', () => {
      scoreService.updateBestScore(1500, 1200);

      const logged = logger.logStructured.mock.calls[0][0];
      expect(logged.app_version).toBe(config.appVersion);
    });

    it('emits exactly one structured log per best score update', () => {
      scoreService.updateBestScore(1500, 1200);

      expect(logger.logStructured).toHaveBeenCalledTimes(1);
    });

    it('passes the correct event name in the log entry', () => {
      scoreService.updateBestScore(1500, 1200);

      const logged = logger.logStructured.mock.calls[0][0];
      expect(logged.event).toBe('best_score_updated');
    });

    it('passes new_best and previous_best as numeric values', () => {
      scoreService.updateBestScore(1500, 1200);

      const logged = logger.logStructured.mock.calls[0][0];
      expect(typeof logged.new_best).toBe('number');
      expect(typeof logged.previous_best).toBe('number');
    });
  });
});
