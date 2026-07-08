'use strict';

const {
  POINTS_PER_CORRECT_ANSWER,
  POINTS_PER_INCORRECT_ANSWER,
  computeScoreDelta,
  applyAnswer,
} = require('./scoring');

describe('scoring', () => {
  describe('computeScoreDelta', () => {
    test('a correct answer is worth +1 point', () => {
      expect(computeScoreDelta(true)).toBe(POINTS_PER_CORRECT_ANSWER);
      expect(computeScoreDelta(true)).toBe(1);
    });

    test('an incorrect answer is worth +0 points — no penalty', () => {
      expect(computeScoreDelta(false)).toBe(POINTS_PER_INCORRECT_ANSWER);
      expect(computeScoreDelta(false)).toBe(0);
    });
  });

  describe('applyAnswer', () => {
    test('a correct answer increases the score by 1', () => {
      const result = applyAnswer(4, true);

      expect(result).toEqual({ score: 5, delta: 1, isCorrect: true });
    });

    test('an incorrect answer leaves the score unchanged', () => {
      const result = applyAnswer(4, false);

      expect(result).toEqual({ score: 4, delta: 0, isCorrect: false });
    });

    test('a failure never makes the score negative or lower than before', () => {
      const result = applyAnswer(0, false);

      expect(result.score).toBe(0);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    test('consecutive failures keep the score flat across a whole streak of misses', () => {
      let score = 7;
      [false, false, false].forEach((isCorrect) => {
        score = applyAnswer(score, isCorrect).score;
      });

      expect(score).toBe(7);
    });

    test('a failure right after a success does not undo the earned point', () => {
      const afterHit = applyAnswer(0, true);
      const afterMiss = applyAnswer(afterHit.score, false);

      expect(afterHit.score).toBe(1);
      expect(afterMiss.score).toBe(1);
    });
  });
});
