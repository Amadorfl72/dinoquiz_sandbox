jest.mock('firebase/app');
jest.mock('firebase/analytics');
jest.mock('firebase/performance');
jest.mock('firebase/functions');

const { logEvent, getAnalytics } = require('firebase/analytics');
const { initializeApp } = require('firebase/app');
const Logger = require('../src/utils/logger').default;

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logGameStarted', () => {
    it('logs partida_iniciada with timestamp and up to 10 question ids', () => {
      const questionIds = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];

      Logger.logGameStarted(questionIds);

      expect(logEvent).toHaveBeenCalledTimes(1);
      const args = logEvent.mock.calls[0];
      expect(args[1]).toBe('partida_iniciada');
      const params = args[2];
      expect(params).toHaveProperty('timestamp');
      expect(typeof params.timestamp).toBe('string');
      expect(params.question_ids).toHaveLength(10);
      expect(params.question_ids).toEqual(questionIds);
    });

    it('slices question ids to first 10 even if more are provided', () => {
      const questionIds = Array.from({ length: 15 }, (_, i) => `q${i}`);

      Logger.logGameStarted(questionIds);

      const params = logEvent.mock.calls[0][2];
      expect(params.question_ids).toHaveLength(10);
      expect(params.question_ids).toEqual(questionIds.slice(0, 10));
    });

    it('handles fewer than 10 question ids', () => {
      const questionIds = ['q1', 'q2', 'q3'];

      Logger.logGameStarted(questionIds);

      const params = logEvent.mock.calls[0][2];
      expect(params.question_ids).toHaveLength(3);
    });

    it('produces a valid ISO timestamp', () => {
      Logger.logGameStarted(['q1']);

      const params = logEvent.mock.calls[0][2];
      const parsed = new Date(params.timestamp);
      expect(parsed.toString()).not.toBe('Invalid Date');
    });
  });

  describe('logQuestionAnswered', () => {
    it('logs pregunta_respondida with id, hit, and response time', () => {
      Logger.logQuestionAnswered('q_1', true, 1500);

      expect(logEvent).toHaveBeenCalledTimes(1);
      const args = logEvent.mock.calls[0];
      expect(args[1]).toBe('pregunta_respondida');
      expect(args[2]).toEqual({
        question_id: 'q_1',
        is_hit: true,
        response_time_ms: 1500
      });
    });

    it('logs pregunta_respondida with is_hit false on wrong answer', () => {
      Logger.logQuestionAnswered('q_2', false, 3200);

      const params = logEvent.mock.calls[0][2];
      expect(params.is_hit).toBe(false);
      expect(params.response_time_ms).toBe(3200);
    });
  });

  describe('logBankValidation', () => {
    it('logs bank_validation as valid with no error', () => {
      Logger.logBankValidation(true);

      expect(logEvent).toHaveBeenCalledTimes(1);
      const args = logEvent.mock.calls[0];
      expect(args[1]).toBe('bank_validation');
      expect(args[2]).toEqual({
        is_valid: true,
        error: null
      });
    });

    it('logs bank_validation as invalid with error message', () => {
      Logger.logBankValidation(false, 'Invalid question bank format');

      const params = logEvent.mock.calls[0][2];
      expect(params.is_valid).toBe(false);
      expect(params.error).toBe('Invalid question bank format');
    });
  });
});
