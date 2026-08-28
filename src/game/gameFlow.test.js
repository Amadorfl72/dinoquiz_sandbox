'use strict';

const {
  QUESTIONS_PER_GAME,
  MIN_LEVEL,
  MAX_LEVEL,
  LEVEL_UP_MIN_CORRECT,
  AGE_BAND_EIGHT_PLUS,
  createInitialGameState,
  shuffle,
  calculateMaxStreak,
  selectGameQuestions,
  startNewGame,
  isValidLevel,
  isEightPlusAgeBand,
  startLevel,
  countCorrectAnswers,
  resolveLevelOutcome,
  completeLevel,
} = require('./gameFlow');
const { loadQuestionBank, DINOSAURS } = require('../data/questionBank');

function buildQuestions(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `q-${index}` }));
}

function buildValidLevelQuestion(overrides = {}) {
  return {
    id: 'trex-01',
    dinosaur: DINOSAURS.TREX,
    question: '¿De qué se alimentaba el Tyrannosaurus Rex?',
    options: ['Solo de plantas', 'De carne', 'Solo de insectos', 'De algas del mar'],
    correctAnswerIndex: 1,
    dato_curioso: 'funFacts.trex-01',
    image: 'dinosaurs/trex.png',
    imageRealistic: 'realistic/trex.svg',
    imageFallback: 'fallback/trex.svg',
    imageAlt: 'Ilustración educativa de un Tyrannosaurus Rex.',
    level: 1,
    ...overrides,
  };
}

function buildLevelQuestions(level, count) {
  return Array.from({ length: count }, (_, index) =>
    buildValidLevelQuestion({ id: `q-level${level}-${index}`, level })
  );
}

function buildMemoryLogService() {
  const events = [];
  return {
    events,
    logEvent(eventType, metadata) {
      events.push({ eventType, metadata });
    },
  };
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

  test('distribution: over many games, every question in the bank gets picked (no dead weight)', () => {
    const questions = buildQuestions(40);
    const seen = new Set();

    for (let attempt = 0; attempt < 400; attempt += 1) {
      selectGameQuestions(questions).forEach((question) => seen.add(question.id));
      if (seen.size === questions.length) break;
    }

    expect(seen.size).toBe(questions.length);
  });

  test('works against the real question bank (public/data/questions.json)', () => {
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

describe('isValidLevel (TRIOFSND-203)', () => {
  test('accepts every integer between MIN_LEVEL and MAX_LEVEL', () => {
    for (let level = MIN_LEVEL; level <= MAX_LEVEL; level += 1) {
      expect(isValidLevel(level)).toBe(true);
    }
  });

  test('rejects levels outside the range, non-integers and non-numbers', () => {
    [0, MAX_LEVEL + 1, 1.5, '1', null, undefined].forEach((level) => {
      expect(isValidLevel(level)).toBe(false);
    });
  });
});

describe('isEightPlusAgeBand (TRIOFSND-203)', () => {
  test('is true only for the "eight-plus" age band', () => {
    expect(isEightPlusAgeBand(AGE_BAND_EIGHT_PLUS)).toBe(true);
  });

  test('is false for the 6-7 age bands and any unknown/missing value', () => {
    ['six', 'seven', 'unknown', '', null, undefined].forEach((ageBand) => {
      expect(isEightPlusAgeBand(ageBand)).toBe(false);
    });
  });
});

describe('countCorrectAnswers (TRIOFSND-203)', () => {
  test('counts only the answers marked correct', () => {
    expect(countCorrectAnswers(buildAnswers('CCFCFFCFCC'))).toBe(6);
  });

  test('returns 0 for an empty game', () => {
    expect(countCorrectAnswers([])).toBe(0);
  });

  test('is defensive against a non-array input', () => {
    expect(countCorrectAnswers(undefined)).toBe(0);
  });
});

describe('startLevel (TRIOFSND-203)', () => {
  test('selects exactly QUESTIONS_PER_GAME unique questions from the requested level only', () => {
    const questions = [...buildLevelQuestions(1, 30), ...buildLevelQuestions(2, 30)];
    const logService = buildMemoryLogService();

    const game = startLevel(1, { questions, logService });

    expect(game.error).toBeUndefined();
    expect(game.level).toBe(1);
    expect(game.state).toEqual(createInitialGameState());
    expect(game.questions).toHaveLength(QUESTIONS_PER_GAME);
    expect(game.questions.every((question) => question.level === 1)).toBe(true);
    const ids = game.questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(logService.events).toEqual([]);
  });

  test('is deterministic given a fixed randomFn', () => {
    const questions = buildLevelQuestions(1, 30);
    const randomFn = () => 0.2;

    const first = startLevel(1, { questions, randomFn, logService: buildMemoryLogService() });
    const second = startLevel(1, { questions, randomFn, logService: buildMemoryLogService() });

    expect(second.questions.map((q) => q.id)).toEqual(first.questions.map((q) => q.id));
  });

  test('returns a level_generation_failed error and logs it when fewer than 10 valid questions remain for the level', () => {
    const questions = buildLevelQuestions(1, 4);
    const logService = buildMemoryLogService();

    const result = startLevel(1, { questions, logService });

    expect(result).toEqual({ error: 'level_generation_failed', level: 1, validQuestionCount: 4 });
    expect(logService.events).toEqual([
      { eventType: 'level_generation_failed', metadata: { level: 1, validQuestionCount: 4 } },
    ]);
  });

  test('excludes individually invalid questions before counting/selecting (delegates to getQuestionsByLevel/TRIOFSND-202)', () => {
    const valid = buildLevelQuestions(1, 9);
    const invalid = buildValidLevelQuestion({ id: 'broken', level: 1, dato_curioso: '' });
    const logService = buildMemoryLogService();

    const result = startLevel(1, { questions: [...valid, invalid], logService });

    expect(result.error).toBe('level_generation_failed');
    expect(result.validQuestionCount).toBe(9);
    expect(logService.events).toEqual(
      expect.arrayContaining([{ eventType: 'content_validation_failed', metadata: { id: 'broken', level: 1, rule: 'dato_curioso' } }])
    );
  });

  test('throws for a level outside MIN_LEVEL-MAX_LEVEL', () => {
    expect(() => startLevel(0, { questions: [] })).toThrow();
    expect(() => startLevel(MAX_LEVEL + 1, { questions: [] })).toThrow();
  });

  test('uses an injected options.getQuestionsByLevel instead of the default resolver', () => {
    const pool = buildLevelQuestions(3, 10);
    const getQuestionsByLevel = jest.fn().mockReturnValue(pool);

    const game = startLevel(3, { getQuestionsByLevel, logService: buildMemoryLogService() });

    expect(getQuestionsByLevel).toHaveBeenCalledWith(3, expect.objectContaining({ getQuestionsByLevel }));
    expect(game.questions).toHaveLength(QUESTIONS_PER_GAME);
  });

  test('works against the real question bank (public/data/questions.json)', () => {
    loadQuestionBank(); // sanity: the real bank on disk is currently valid

    const game = startLevel(1, {});

    expect(game.error).toBeUndefined();
    expect(game.questions).toHaveLength(QUESTIONS_PER_GAME);
    expect(game.questions.every((question) => question.level === 1)).toBe(true);
  });
});

describe('resolveLevelOutcome (TRIOFSND-203)', () => {
  test('age 8+, >=LEVEL_UP_MIN_CORRECT aciertos on a level below MAX_LEVEL unlocks the next level', () => {
    const outcome = resolveLevelOutcome({
      level: 2,
      answers: buildAnswers('CCCCCCFFFF'), // 6 correct
      ageBand: AGE_BAND_EIGHT_PLUS,
    });

    expect(outcome).toEqual({
      gameOver: false,
      nextLevel: 3,
      level: 2,
      correctCount: LEVEL_UP_MIN_CORRECT,
      reason: 'level_up',
    });
  });

  test('age 8+, <=5 aciertos on a level below MAX_LEVEL ends the game', () => {
    const outcome = resolveLevelOutcome({
      level: 2,
      answers: buildAnswers('CCCCCFFFFF'), // 5 correct
      ageBand: AGE_BAND_EIGHT_PLUS,
    });

    expect(outcome).toEqual({
      gameOver: true,
      nextLevel: null,
      level: 2,
      correctCount: 5,
      reason: 'insufficient_score',
    });
  });

  test('age 8+, completing MAX_LEVEL always ends the game, even with a perfect score', () => {
    const outcome = resolveLevelOutcome({
      level: MAX_LEVEL,
      answers: buildAnswers('CCCCCCCCCC'),
      ageBand: AGE_BAND_EIGHT_PLUS,
    });

    expect(outcome).toEqual({
      gameOver: true,
      nextLevel: null,
      level: MAX_LEVEL,
      correctCount: 10,
      reason: 'completed_all_levels',
    });
  });

  test('ages 6-7 are restricted to level 1 and the game always ends, even with a perfect score', () => {
    ['six', 'seven'].forEach((ageBand) => {
      const outcome = resolveLevelOutcome({
        level: MIN_LEVEL,
        answers: buildAnswers('CCCCCCCCCC'),
        ageBand,
      });

      expect(outcome).toEqual({
        gameOver: true,
        nextLevel: null,
        level: MIN_LEVEL,
        correctCount: 10,
        reason: 'age_restricted',
      });
    });
  });

  test('treats a missing/unknown ageBand the same as the 6-7 restriction (safe default)', () => {
    const outcome = resolveLevelOutcome({ level: MIN_LEVEL, answers: buildAnswers('CCCCCCCCCC') });

    expect(outcome.gameOver).toBe(true);
    expect(outcome.reason).toBe('age_restricted');
  });

  test('derives correctCount exclusively from this level\'s own answers, never a cross-level total', () => {
    const outcome = resolveLevelOutcome({
      level: 1,
      answers: buildAnswers('CCCCCCFFFF'),
      ageBand: AGE_BAND_EIGHT_PLUS,
    });

    expect(outcome.correctCount).toBe(countCorrectAnswers(buildAnswers('CCCCCCFFFF')));
  });

  test('throws for a level outside MIN_LEVEL-MAX_LEVEL', () => {
    expect(() => resolveLevelOutcome({ level: 0, answers: [], ageBand: AGE_BAND_EIGHT_PLUS })).toThrow();
  });
});

describe('completeLevel (TRIOFSND-203)', () => {
  test('when the game is over, returns the outcome with no nextLevelGame attached', () => {
    const outcome = completeLevel({
      level: MAX_LEVEL,
      answers: buildAnswers('CCCCCCCCCC'),
      ageBand: AGE_BAND_EIGHT_PLUS,
    });

    expect(outcome.gameOver).toBe(true);
    expect(outcome.nextLevelGame).toBeUndefined();
  });

  test('when a next level unlocks, also starts it and attaches it as nextLevelGame', () => {
    const questions = [...buildLevelQuestions(1, 30), ...buildLevelQuestions(2, 30)];
    const logService = buildMemoryLogService();

    const outcome = completeLevel({
      level: 1,
      answers: buildAnswers('CCCCCCFFFF'), // 6 correct
      ageBand: AGE_BAND_EIGHT_PLUS,
      questions,
      logService,
    });

    expect(outcome.gameOver).toBe(false);
    expect(outcome.nextLevel).toBe(2);
    expect(outcome.nextLevelGame.error).toBeUndefined();
    expect(outcome.nextLevelGame.level).toBe(2);
    expect(outcome.nextLevelGame.questions).toHaveLength(QUESTIONS_PER_GAME);
    expect(outcome.nextLevelGame.questions.every((question) => question.level === 2)).toBe(true);
  });

  test('surfaces a level_generation_failed nextLevelGame when the unlocked level has too few valid questions', () => {
    const questions = buildLevelQuestions(1, 30); // no level-2 questions at all
    const logService = buildMemoryLogService();

    const outcome = completeLevel({
      level: 1,
      answers: buildAnswers('CCCCCCFFFF'),
      ageBand: AGE_BAND_EIGHT_PLUS,
      questions,
      logService,
    });

    expect(outcome.gameOver).toBe(false);
    expect(outcome.nextLevelGame).toEqual({ error: 'level_generation_failed', level: 2, validQuestionCount: 0 });
  });
});

describe('resolveLevelOutcome / completeLevel independent per-mode progression (TRIOFSND-249)', () => {
  const OTHER_MODE_ID = 'laberinto';

  test('a non-quiz mode is never subject to the quiz-only age-band restriction', () => {
    const outcome = resolveLevelOutcome({
      level: MIN_LEVEL,
      answers: buildAnswers('FFFFFFFFFF'), // 0 correct, and no ageBand at all
      modeId: OTHER_MODE_ID,
    });

    expect(outcome.reason).not.toBe('age_restricted');
  });

  test('threshold met unlocks the next level, in-mode only, with no ageBand involved', () => {
    const outcome = resolveLevelOutcome({
      level: 2,
      answers: buildAnswers('CCCCCCFFFF'), // 6 correct, meets the shared default threshold
      modeId: OTHER_MODE_ID,
    });

    expect(outcome).toEqual({
      gameOver: false,
      nextLevel: 3,
      level: 2,
      correctCount: 6,
      reason: 'level_up',
    });
  });

  test('threshold missed keeps the level locked', () => {
    const outcome = resolveLevelOutcome({
      level: 2,
      answers: buildAnswers('CCCCCFFFFF'), // 5 correct, below the threshold
      modeId: OTHER_MODE_ID,
    });

    expect(outcome).toEqual({
      gameOver: true,
      nextLevel: null,
      level: 2,
      correctCount: 5,
      reason: 'insufficient_score',
    });
  });

  test('completing the last level ends the game without offering a nonexistent next level', () => {
    const outcome = completeLevel({
      level: MAX_LEVEL,
      answers: buildAnswers('CCCCCCCCCC'),
      modeId: OTHER_MODE_ID,
    });

    expect(outcome.gameOver).toBe(true);
    expect(outcome.nextLevel).toBeNull();
    expect(outcome.nextLevelGame).toBeUndefined();
  });

  test('resolving one mode never reads or is influenced by another mode resolved just before it', () => {
    const quizOutcome = resolveLevelOutcome({
      level: 2,
      answers: buildAnswers('CCCCCFFFFF'), // 5 correct: locked for quiz
      modeId: 'quiz',
      ageBand: AGE_BAND_EIGHT_PLUS,
    });
    const laberintoOutcome = resolveLevelOutcome({
      level: 2,
      answers: buildAnswers('CCCCCCFFFF'), // 6 correct: unlocked for laberinto
      modeId: OTHER_MODE_ID,
    });

    expect(quizOutcome.reason).toBe('insufficient_score');
    expect(laberintoOutcome.reason).toBe('level_up');
  });

  test('repeating an already-cleared level is idempotent: no drift, no re-incremented unlock counter', () => {
    const params = {
      level: 3,
      answers: buildAnswers('CCCCCCFFFF'), // 6 correct
      modeId: OTHER_MODE_ID,
    };

    const first = resolveLevelOutcome(params);
    const second = resolveLevelOutcome(params); // simulates replaying the same already-cleared level

    expect(second).toEqual(first);
    expect(second.nextLevel).toBe(4);
  });

  test('defaults to the quiz mode, age-band restriction included, when modeId is omitted', () => {
    const outcome = resolveLevelOutcome({
      level: MIN_LEVEL,
      answers: buildAnswers('CCCCCCCCCC'),
      ageBand: 'six',
    });

    expect(outcome.reason).toBe('age_restricted');
  });
});
