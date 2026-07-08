'use strict';

const {
  POINTS_PER_CORRECT_ANSWER,
  POINTS_PER_INCORRECT_ANSWER,
  isAnswerCorrect,
  computeScoreDelta,
  applyAnswerToScore,
  applyAnswer,
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
