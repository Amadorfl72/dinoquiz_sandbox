'use strict';

const {
  POINTS_PER_CORRECT_ANSWER,
  POINTS_PER_INCORRECT_ANSWER,
  MAX_STARS,
  isAnswerCorrect,
  computeScoreDelta,
  applyAnswerToScore,
  applyAnswer,
  calculatePercentage,
  calculateStarTier,
  normalizeOutcome,
} = require('./scoring');

function buildQuestion(overrides = {}) {
  return {
    id: 'trex-01',
    options: ['Solo de plantas', 'De carne', 'Solo de insectos', 'De algas del mar'],
    correctAnswerIndex: 1,
    ...overrides,
  };
}

describe('isAnswerCorrect', () => {
  test('returns true when the selected index matches the correct answer', () => {
    expect(isAnswerCorrect(buildQuestion(), 1)).toBe(true);
  });

  test('returns false when the selected index does not match', () => {
    expect(isAnswerCorrect(buildQuestion(), 0)).toBe(false);
  });

  test('returns false for every wrong option, including the last one', () => {
    const question = buildQuestion();
    [0, 2, 3].forEach((index) => {
      expect(isAnswerCorrect(question, index)).toBe(false);
    });
  });
});

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

describe('applyAnswerToScore', () => {
  test('adds exactly 1 point on a correct answer', () => {
    expect(applyAnswerToScore(0, true)).toBe(1);
    expect(applyAnswerToScore(4, true)).toBe(5);
  });

  test('does not penalize a wrong answer: the score is left unchanged', () => {
    expect(applyAnswerToScore(0, false)).toBe(0);
    expect(applyAnswerToScore(7, false)).toBe(7);
  });

  test('never returns a score lower than the one passed in', () => {
    const before = 3;
    expect(applyAnswerToScore(before, false)).toBeGreaterThanOrEqual(before);
    expect(applyAnswerToScore(before, true)).toBeGreaterThanOrEqual(before);
  });

  test('accumulates correctly across a full 10-question game (mixed hits and misses)', () => {
    const results = [true, false, true, true, false, false, true, false, true, true];
    const finalScore = results.reduce((score, correct) => applyAnswerToScore(score, correct), 0);
    expect(finalScore).toBe(6);
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

describe('calculatePercentage', () => {
  test('converts a score/maxScore pair into a whole 0-100 percentage', () => {
    expect(calculatePercentage(0, 10)).toBe(0);
    expect(calculatePercentage(5, 10)).toBe(50);
    expect(calculatePercentage(10, 10)).toBe(100);
  });

  test('is independent of the mode-specific maxScore -- any scale normalizes onto 0-100', () => {
    expect(calculatePercentage(3, 6)).toBe(50);
    expect(calculatePercentage(4, 8)).toBe(50);
    expect(calculatePercentage(1, 3)).toBe(33);
  });

  test('rejects a score outside 0..maxScore', () => {
    expect(() => calculatePercentage(-1, 10)).toThrow();
    expect(() => calculatePercentage(11, 10)).toThrow();
  });

  test('rejects a maxScore that is not a positive number', () => {
    expect(() => calculatePercentage(1, 0)).toThrow();
    expect(() => calculatePercentage(1, -5)).toThrow();
  });
});

describe('calculateStarTier', () => {
  test.each([
    [0, 1],
    [30, 1],
    [31, 2],
    [60, 2],
    [61, 3],
    [100, 3],
  ])('percentage %i maps to %i star(s)', (percentage, expectedStars) => {
    expect(calculateStarTier(percentage)).toBe(expectedStars);
  });

  test('never returns more than MAX_STARS', () => {
    expect(calculateStarTier(100)).toBe(MAX_STARS);
  });

  test('rejects a percentage outside 0..100', () => {
    expect(() => calculateStarTier(-1)).toThrow();
    expect(() => calculateStarTier(101)).toThrow();
  });
});

describe('normalizeOutcome', () => {
  test('converts a 10-round score (Quiz/Laberinto/Parejas/Clasifica scale) into percentage + stars', () => {
    expect(normalizeOutcome(0, 10)).toEqual({ percentage: 0, stars: 1 });
    expect(normalizeOutcome(3, 10)).toEqual({ percentage: 30, stars: 1 });
    expect(normalizeOutcome(4, 10)).toEqual({ percentage: 40, stars: 2 });
    expect(normalizeOutcome(6, 10)).toEqual({ percentage: 60, stars: 2 });
    expect(normalizeOutcome(7, 10)).toEqual({ percentage: 70, stars: 3 });
    expect(normalizeOutcome(10, 10)).toEqual({ percentage: 100, stars: 3 });
  });

  test('maps a mode with a different maxScore onto the exact same visual scale', () => {
    expect(normalizeOutcome(2, 8)).toEqual({ percentage: 25, stars: 1 });
    expect(normalizeOutcome(4, 8)).toEqual({ percentage: 50, stars: 2 });
    expect(normalizeOutcome(8, 8)).toEqual({ percentage: 100, stars: 3 });
  });
});
