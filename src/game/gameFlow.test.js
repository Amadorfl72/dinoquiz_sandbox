'use strict';

const {
  QUESTIONS_PER_GAME,
  createInitialGameState,
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
