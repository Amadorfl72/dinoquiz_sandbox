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

  // TRIOFSND-102: gameFlow.startNewGame is the "motor canónico" -- the single
  // place that validates a partida (exactly 10 unique IDs, and, on a replay,
  // an ID set that differs from the previous game) before the app shell is
  // allowed to increment partida_iniciada.
  describe('TRIOFSND-102: partida validation', () => {
    test('every accepted partida has exactly QUESTIONS_PER_GAME questions with unique, stable IDs', () => {
      const questions = buildQuestions(40);
      const game = startNewGame(questions);

      expect(game.questions).toHaveLength(QUESTIONS_PER_GAME);
      const ids = game.questions.map((q) => q.id);
      expect(new Set(ids).size).toBe(QUESTIONS_PER_GAME);
    });

    test('returns null instead of a partial game when the bank has fewer than QUESTIONS_PER_GAME questions', () => {
      const questions = buildQuestions(5);
      expect(startNewGame(questions)).toBeNull();
    });

    test('a replay whose ID set differs from the previous game (even reordered) is accepted', () => {
      const questions = buildQuestions(20);
      const firstGame = startNewGame(questions, { randomFn: () => 0 });
      const previousIds = firstGame.questions.map((q) => q.id);

      const replay = startNewGame(questions, { randomFn: () => 0.5, previousQuestionIds: previousIds });

      expect(replay).not.toBeNull();
      expect(replay.questions).toHaveLength(QUESTIONS_PER_GAME);
      const replayIds = replay.questions.map((q) => q.id);
      expect(new Set(replayIds).size).toBe(QUESTIONS_PER_GAME);
      expect(new Set(replayIds)).not.toEqual(new Set(previousIds));
    });

    test('a same-set replay (same 10 IDs, only reordered) is rejected as a match, not accepted', () => {
      const questions = buildQuestions(10); // bank size === QUESTIONS_PER_GAME: only one possible set
      const firstGame = startNewGame(questions, { randomFn: () => 0 });
      const previousIds = firstGame.questions.map((q) => q.id);
      // Reordered copy of the very same set, exercising order-independent comparison.
      const reorderedPreviousIds = previousIds.slice().reverse();

      const replay = startNewGame(questions, { randomFn: () => 0.5, previousQuestionIds: reorderedPreviousIds });

      expect(replay).toBeNull();
    });

    test('returns null when the bank cannot offer any set different from the previous game', () => {
      const questions = buildQuestions(10);
      const firstGame = startNewGame(questions, { randomFn: () => 0 });
      const previousIds = firstGame.questions.map((q) => q.id);

      expect(startNewGame(questions, { previousQuestionIds: previousIds })).toBeNull();
    });

    test('a replay may legitimately share some (not all) questions with the previous game', () => {
      const questions = buildQuestions(11); // exactly one question beyond QUESTIONS_PER_GAME
      const firstGame = startNewGame(questions, { randomFn: () => 0 });
      const previousIds = firstGame.questions.map((q) => q.id);

      const replay = startNewGame(questions, { randomFn: () => 0, previousQuestionIds: previousIds });

      expect(replay).not.toBeNull();
      const replayIds = replay.questions.map((q) => q.id);
      const overlap = replayIds.filter((id) => previousIds.includes(id));
      expect(overlap.length).toBeGreaterThan(0);
      expect(overlap.length).toBeLessThan(QUESTIONS_PER_GAME);
    });

    test('avoiding a same-set replay is deterministic, not left to chance, when the bank has room', () => {
      const questions = buildQuestions(11);
      // A randomFn fixed at 0 would otherwise pick the exact same ordered
      // subset every time; the engine must still produce a different set.
      const firstGame = startNewGame(questions, { randomFn: () => 0 });
      const previousIds = firstGame.questions.map((q) => q.id);

      const replay = startNewGame(questions, { randomFn: () => 0, previousQuestionIds: previousIds });

      expect(replay).not.toBeNull();
      const replayIds = replay.questions.map((q) => q.id);
      expect(new Set(replayIds)).not.toEqual(new Set(previousIds));
    });
  });
});
