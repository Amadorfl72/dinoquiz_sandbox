'use strict';

const {
  QUESTIONS_PER_GAME,
  createInitialGameState,
  calculateMaxStreak,
  selectGameQuestions,
  startNewGame,
} = require('./gameFlow');

function buildQuestions(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `q-${index}` }));
}

describe('createInitialGameState', () => {
  test('resets score, question index and answers to their initial values', () => {
    expect(createInitialGameState()).toEqual({ score: 0, questionIndex: 0, answers: [] });
  });

  test('returns a fresh object each call so callers cannot share mutable state', () => {
    expect(createInitialGameState()).not.toBe(createInitialGameState());
  });
});

function buildAnswers(pattern) {
  return pattern.split('').map((mark) => ({ isCorrect: mark === 'C' }));
}

describe('calculateMaxStreak', () => {
  test('returns 0 for an empty game (no answers yet)', () => {
    expect(calculateMaxStreak([])).toBe(0);
  });

  test('returns 0 when every answer is wrong', () => {
    expect(calculateMaxStreak(buildAnswers('FFFFFFFFFF'))).toBe(0);
  });

  test('returns 10 when every answer is correct (a perfect game)', () => {
    expect(calculateMaxStreak(buildAnswers('CCCCCCCCCC'))).toBe(10);
  });

  test('finds the longest run even when it is not the most recent one (test_scenario 7/10)', () => {
    // 4 hits, a miss, then 3 more hits: longest run is 4, final score is 7/10.
    expect(calculateMaxStreak(buildAnswers('CCCCFCCCFF'))).toBe(4);
  });

  test('finds a short streak surrounded by misses (test_scenario 2/10)', () => {
    // Exactly 2 hits, back to back: longest run is 2, final score is 2/10.
    expect(calculateMaxStreak(buildAnswers('FFFCCFFFFF'))).toBe(2);
  });

  test('a streak broken right before the last question does not count the last answer', () => {
    expect(calculateMaxStreak(buildAnswers('CCCFC'))).toBe(3);
  });

  test('is defensive against a non-array input', () => {
    expect(calculateMaxStreak(undefined)).toBe(0);
  });
});

describe('selectGameQuestions', () => {
  test('selects exactly QUESTIONS_PER_GAME questions by default', () => {
    const questions = buildQuestions(40);
    expect(selectGameQuestions(questions)).toHaveLength(QUESTIONS_PER_GAME);
  });

  test('never repeats a question within the same game', () => {
    const questions = buildQuestions(40);
    const selected = selectGameQuestions(questions);
    const ids = selected.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('caps the selection at the size of the bank', () => {
    const questions = buildQuestions(3);
    expect(selectGameQuestions(questions, 10)).toHaveLength(3);
  });

  test('is deterministic given a fixed randomFn, and different seeds yield different subsets', () => {
    const questions = buildQuestions(40);
    const first = selectGameQuestions(questions, 10, () => 0);
    const second = selectGameQuestions(questions, 10, () => 0.9999);

    expect(first.map((q) => q.id)).not.toEqual(second.map((q) => q.id));
  });

  test('throws when questions is not an array', () => {
    expect(() => selectGameQuestions(undefined)).toThrow();
  });
});

describe('startNewGame', () => {
  test('bundles a fresh initial state with a new random question subset', () => {
    const questions = buildQuestions(40);
    const game = startNewGame(questions);

    expect(game.state).toEqual(createInitialGameState());
    expect(game.questions).toHaveLength(QUESTIONS_PER_GAME);
  });

  test('replaying picks a different subset than the previous game (AC-9)', () => {
    const questions = buildQuestions(40);
    let seed = 0;
    const randomFn = () => {
      seed += 0.031;
      return seed % 1;
    };

    const firstGame = startNewGame(questions, { randomFn });
    const secondGame = startNewGame(questions, { randomFn });

    expect(secondGame.questions.map((q) => q.id)).not.toEqual(firstGame.questions.map((q) => q.id));
  });
});
