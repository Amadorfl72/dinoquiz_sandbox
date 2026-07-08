'use strict';

const { isAnswerCorrect, applyAnswerToScore } = require('./scoring');

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
