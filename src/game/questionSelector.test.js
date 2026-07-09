'use strict';

const { QUESTIONS_PER_GAME, shuffle, selectGameQuestions } = require('./questionSelector');
const { loadQuestionBank } = require('../data/questionBank');

function buildQuestions(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `q-${index}` }));
}

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

    const selection = selectGameQuestions(questions);

    expect(selection).toHaveLength(QUESTIONS_PER_GAME);
    expect(QUESTIONS_PER_GAME).toBe(10);
  });

  test('never selects the same question twice within one game (AC-3)', () => {
    const questions = buildQuestions(40);

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const selection = selectGameQuestions(questions);
      const ids = selection.map((question) => question.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test('only returns questions that belong to the original bank', () => {
    const questions = buildQuestions(40);
    const validIds = new Set(questions.map((question) => question.id));

    const selection = selectGameQuestions(questions);

    selection.forEach((question) => {
      expect(validIds.has(question.id)).toBe(true);
    });
  });

  test('supports a custom count', () => {
    const questions = buildQuestions(40);

    const selection = selectGameQuestions(questions, { count: 5 });

    expect(selection).toHaveLength(5);
  });

  test('throws when the bank has fewer questions than requested', () => {
    const questions = buildQuestions(9);

    expect(() => selectGameQuestions(questions)).toThrow(/requires at least 10/);
  });

  test('is deterministic given a fixed randomFn', () => {
    const questions = buildQuestions(40);
    const randomFn = () => 0.42;

    expect(selectGameQuestions(questions, { randomFn })).toEqual(
      selectGameQuestions(questions, { randomFn })
    );
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

  test('distribution: each question is picked at a roughly even rate across many games', () => {
    const questions = buildQuestions(40);
    const pickCounts = questions.reduce((counts, question) => {
      counts[question.id] = 0;
      return counts;
    }, {});

    const GAMES = 2000;
    for (let attempt = 0; attempt < GAMES; attempt += 1) {
      selectGameQuestions(questions).forEach((question) => {
        pickCounts[question.id] += 1;
      });
    }

    const expectedPicksPerQuestion = (GAMES * QUESTIONS_PER_GAME) / questions.length;
    Object.values(pickCounts).forEach((picks) => {
      expect(picks).toBeGreaterThan(expectedPicksPerQuestion * 0.5);
      expect(picks).toBeLessThan(expectedPicksPerQuestion * 1.5);
    });
  });

  test('works against the real 40-question bank (src/data/questions.json)', () => {
    const questions = loadQuestionBank();

    const selection = selectGameQuestions(questions);

    expect(selection).toHaveLength(QUESTIONS_PER_GAME);
    const ids = selection.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
