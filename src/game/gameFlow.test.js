'use strict';

const {
  QUESTIONS_PER_GAME,
  createInitialGameState,
  shuffle,
  selectGameQuestions,
  startNewGame,
} = require('./gameFlow');
const { loadQuestionBank } = require('../data/questionBank');

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

describe('shuffle', () => {
  test('does not mutate the input array', () => {
    const input = buildQuestions(5);
    const copy = input.slice();

    shuffle(input);

    expect(input).toEqual(copy);
  });

  test('returns an array with the same elements, just reordered', () => {
    const input = buildQuestions(20);

    const result = shuffle(input);

    expect(result).toHaveLength(input.length);
    expect([...result].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...input].sort((a, b) => a.id.localeCompare(b.id))
    );
  });

  test('is deterministic given a fixed randomFn', () => {
    const input = buildQuestions(6);
    const randomFn = () => 0;

    expect(shuffle(input, randomFn)).toEqual(shuffle(input, randomFn));
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

  test('distribution: over many games, every question in the bank gets picked (no dead weight)', () => {
    const questions = buildQuestions(40);
    const seen = new Set();

    for (let attempt = 0; attempt < 400; attempt += 1) {
      selectGameQuestions(questions).forEach((question) => seen.add(question.id));
      if (seen.size === questions.length) break;
    }

    expect(seen.size).toBe(questions.length);
  });

  test('works against the real 40-question bank (public/data/questions.json)', () => {
    const questions = loadQuestionBank();

    const selection = selectGameQuestions(questions);

    expect(selection).toHaveLength(QUESTIONS_PER_GAME);
    const ids = selection.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe('previousQuestionIds (TRIOFSND-101, AC-9)', () => {
    test('replay is fully disjoint from the previous game when the bank has enough fresh candidates', () => {
      const questions = buildQuestions(40);
      const previous = selectGameQuestions(questions, 10, () => 0.1);
      const previousIds = previous.map((question) => question.id);

      for (let attempt = 0; attempt < 20; attempt += 1) {
        const replay = selectGameQuestions(questions, 10, Math.random, previousIds);
        const replayIds = replay.map((question) => question.id);

        expect(replayIds).toHaveLength(10);
        expect(new Set(replayIds).size).toBe(10);
        expect(replayIds.some((id) => previousIds.includes(id))).toBe(false);
      }
    });

    test('falls back to reusing previous questions when the bank is too small to avoid them', () => {
      const questions = buildQuestions(10);
      const previousIds = questions.map((question) => question.id);

      const replay = selectGameQuestions(questions, 10, Math.random, previousIds);

      expect(replay).toHaveLength(10);
      expect(new Set(replay.map((question) => question.id)).size).toBe(10);
    });

    test('an empty previousQuestionIds list behaves like no exclusion at all', () => {
      const questions = buildQuestions(40);
      const randomFn = () => 0.42;

      expect(selectGameQuestions(questions, 10, randomFn, [])).toEqual(
        selectGameQuestions(questions, 10, randomFn)
      );
    });
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

  test('passing the previous game\'s question ids guarantees a disjoint replay when possible (AC-9)', () => {
    const questions = buildQuestions(40);

    const firstGame = startNewGame(questions, { randomFn: () => 0.2 });
    const previousQuestionIds = firstGame.questions.map((q) => q.id);

    const secondGame = startNewGame(questions, { randomFn: Math.random, previousQuestionIds });
    const secondIds = secondGame.questions.map((q) => q.id);

    expect(secondIds.some((id) => previousQuestionIds.includes(id))).toBe(false);
  });
});
