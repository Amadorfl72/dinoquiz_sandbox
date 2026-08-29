'use strict';

const path = require('path');

const PAREJAS_GAME_PATH = path.resolve(__dirname, '../../public/scripts/parejasGame.js');

const {
  ROUNDS_PER_GAME,
  MODE_ID,
  MIN_PAIRS,
  MAX_PAIRS,
  MAX_COLUMNS,
  MAX_VISIBLE_UNMATCHED,
  CARD_STATES,
  DIFFICULTY_BIAS,
  DEFAULT_DINOSAUR_POOL,
  DINOSAUR_VISUAL_FAMILIES,
  hasUsableCardImage,
  eligibleCardCreatureIds,
  validateCatalog,
  pairCountForLevel,
  computeColumns,
  softAttemptLimitForLevel,
  difficultyBiasForLevel,
  selectCreaturesForBoard,
  startRound,
  revealCard,
  resolveSelection,
  evaluateRound,
  startGame,
  completeRound,
  completeLevel,
} = require(PAREJAS_GAME_PATH);
const { CREATURE_SHEETS } = require('../../src/data/creatureSheet');
const { VALID_DINOSAURS } = require('../../src/data/questionBank');
const { MODE_IDS, AVAILABILITY_CAUSES } = require('../../src/game/modesCatalog');

/**
 * TRIOFSND-276: public/scripts/parejasGame.js is the browser-runnable twin of
 * src/game/parejasGame.js (see that file's own doc comment for why it can't
 * just re-export it -- the real module's dependency chain requires `fs`,
 * which doesn't exist in a real, unbundled browser). Its local
 * `DINOSAUR_VISUAL_FAMILIES` mirrors src/data/creatureSheet.js by hand, so
 * this guards against the two silently drifting apart, and exercises the
 * same round/game state machine + level-unlock chain main.js drives at
 * runtime.
 */
describe('public/scripts/parejasGame.js mirrors the authoritative creature data', () => {
  test('DEFAULT_DINOSAUR_POOL matches the shipped dinosaur roster', () => {
    expect(DEFAULT_DINOSAUR_POOL.slice().sort()).toEqual(VALID_DINOSAURS.slice().sort());
  });

  test('DINOSAUR_VISUAL_FAMILIES matches the exact same visualFamily as src/data/creatureSheet.js for every shipped dinosaur', () => {
    VALID_DINOSAURS.forEach((id) => {
      expect(DINOSAUR_VISUAL_FAMILIES[id]).toBe(CREATURE_SHEETS[id].visualFamily);
    });
  });

  test('MODE_ID matches src/game/modesCatalog.js MODE_IDS.PAREJAS', () => {
    expect(MODE_ID).toBe(MODE_IDS.PAREJAS);
  });
});

describe('validateCatalog (gate: >=8 elegible creatures)', () => {
  test('blocks Parejas with a machine-readable cause when the catalog has 7 or fewer creatures', () => {
    const result = validateCatalog({ dinosaurPool: DEFAULT_DINOSAUR_POOL.slice(0, 7) });
    expect(result.available).toBe(false);
    expect(result.cause).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES);
    expect(result.details).toEqual({ need: 8, have: 7 });
  });

  test('is available with exactly 8 creatures', () => {
    const result = validateCatalog({ dinosaurPool: DEFAULT_DINOSAUR_POOL.slice(0, 8) });
    expect(result.available).toBe(true);
  });

  test('defaults to the real shipped creature roster (14 creatures, always available today)', () => {
    expect(validateCatalog().available).toBe(true);
  });

  test('a duplicated id in dinosaurPool only counts once toward the gate', () => {
    const eightUniquePlusOneDuplicate = DEFAULT_DINOSAUR_POOL.slice(0, 8).concat([DEFAULT_DINOSAUR_POOL[0]]);
    const sevenUniquePlusOneDuplicate = DEFAULT_DINOSAUR_POOL.slice(0, 7).concat([DEFAULT_DINOSAUR_POOL[0]]);

    expect(validateCatalog({ dinosaurPool: eightUniquePlusOneDuplicate }).available).toBe(true);
    expect(validateCatalog({ dinosaurPool: sevenUniquePlusOneDuplicate }).available).toBe(false);
  });

  test('an invalid or imageless id in dinosaurPool never counts toward the gate', () => {
    const sevenRealPlusGarbage = DEFAULT_DINOSAUR_POOL.slice(0, 7).concat(['not-a-real-dinosaur', '', null]);
    const result = validateCatalog({ dinosaurPool: sevenRealPlusGarbage });

    expect(result.available).toBe(false);
    expect(result.cause).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES);
    expect(result.details).toEqual({ need: 8, have: 7 });
  });
});

describe('hasUsableCardImage / eligibleCardCreatureIds', () => {
  test('every shipped dinosaur has a real, usable card-front image', () => {
    DEFAULT_DINOSAUR_POOL.forEach((id) => {
      expect(hasUsableCardImage(id)).toBe(true);
    });
  });

  test('rejects invalid ids', () => {
    expect(hasUsableCardImage('not-a-real-dinosaur')).toBe(false);
    expect(hasUsableCardImage('')).toBe(false);
    expect(hasUsableCardImage(null)).toBe(false);
  });

  test('dedupes and drops invalid/imageless ids, preserving first-seen order', () => {
    const pool = ['trex', 'bogus', 'triceratops', 'trex'];
    expect(eligibleCardCreatureIds(pool)).toEqual(['trex', 'triceratops']);
  });
});

describe('pairCountForLevel / computeColumns / softAttemptLimitForLevel / difficultyBiasForLevel', () => {
  test('pairCountForLevel scales from MIN_PAIRS to MAX_PAIRS, monotonically non-decreasing', () => {
    let previous = 0;
    for (let level = 1; level <= 10; level += 1) {
      const pairCount = pairCountForLevel(level);
      expect(pairCount).toBeGreaterThanOrEqual(MIN_PAIRS);
      expect(pairCount).toBeLessThanOrEqual(MAX_PAIRS);
      expect(pairCount).toBeGreaterThanOrEqual(previous);
      previous = pairCount;
    }
  });

  test('computeColumns never exceeds MAX_COLUMNS (PRD: 375px width) and never exceeds the card count itself for a smaller board', () => {
    expect(computeColumns(16)).toBe(MAX_COLUMNS);
    expect(computeColumns(3)).toBe(3);
  });

  test('softAttemptLimitForLevel never blocks -- it is generous at level 1 and tightens by the top level', () => {
    const pairCount = pairCountForLevel(1);
    expect(softAttemptLimitForLevel(1, pairCount)).toBeGreaterThan(pairCount);
    expect(softAttemptLimitForLevel(10, pairCountForLevel(10))).toBe(pairCountForLevel(10));
  });

  test('difficultyBiasForLevel is diverse below the similarity threshold and similar at/above it', () => {
    expect(difficultyBiasForLevel(1)).toBe(DIFFICULTY_BIAS.DIVERSE);
    expect(difficultyBiasForLevel(10)).toBe(DIFFICULTY_BIAS.SIMILAR);
  });
});

describe('selectCreaturesForBoard', () => {
  test('returns pairCount distinct creatures from the pool', () => {
    const ids = selectCreaturesForBoard({ pairCount: 4, level: 1, dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0.2 });
    expect(new Set(ids).size).toBe(4);
  });

  test('throws instead of silently reusing a creature when the pool is too small', () => {
    expect(() =>
      selectCreaturesForBoard({ pairCount: 4, level: 1, dinosaurPool: ['trex', 'triceratops'], randomFn: () => 0 })
    ).toThrow();
  });
});

describe('startRound / a full board, played end to end', () => {
  test('builds an all-hidden board of complete pairs, at most MAX_COLUMNS wide', () => {
    const round = startRound({ roundIndex: 0, level: 1, seed: 's', dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0.3 });

    expect(round.cards.length % 2).toBe(0);
    expect(round.cards.length).toBeGreaterThanOrEqual(MIN_PAIRS * 2);
    expect(round.cards.length).toBeLessThanOrEqual(MAX_PAIRS * 2);
    expect(round.columns).toBeLessThanOrEqual(MAX_COLUMNS);
    round.cards.forEach((card) => expect(card.state).toBe(CARD_STATES.HIDDEN));

    const byCreature = {};
    round.cards.forEach((card) => {
      byCreature[card.creatureId] = (byCreature[card.creatureId] || 0) + 1;
    });
    Object.values(byCreature).forEach((count) => expect(count).toBe(2));
  });

  test('a third reveal is blocked while two unmatched cards are already face up', () => {
    let round = startRound({ roundIndex: 0, level: 1, seed: 's', dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0.1 });
    round = revealCard(round, round.cards[0].cardId);
    round = revealCard(round, round.cards[1].cardId);
    const blocked = revealCard(round, round.cards[2].cardId);
    expect(blocked.blocked).toBe(true);
    expect(blocked.revealedCardIds).toHaveLength(2);
  });

  test('a mismatch flips both cards back to hidden and never blocks further reveals', () => {
    const round = startRound({ roundIndex: 0, level: 1, seed: 's', dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0.1 });
    const mismatchIndex = round.cards.findIndex((card) => card.creatureId !== round.cards[0].creatureId);

    let next = revealCard(round, round.cards[0].cardId);
    next = revealCard(next, round.cards[mismatchIndex].cardId);
    next = resolveSelection(next);

    expect(next.status).toBe('playing');
    expect(next.cards[0].state).toBe(CARD_STATES.HIDDEN);
    expect(next.cards[mismatchIndex].state).toBe(CARD_STATES.HIDDEN);
    expect(next.mismatches).toBe(1);

    const reopened = revealCard(next, round.cards[0].cardId);
    expect(reopened.blocked).toBe(false);
  });

  test('completing every pair, even after exceeding the soft attempt limit, always finishes the round', () => {
    const round = startRound({ roundIndex: 0, level: 1, seed: 's', dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0.1 });
    const byCreature = {};
    round.cards.forEach((card) => {
      (byCreature[card.creatureId] = byCreature[card.creatureId] || []).push(card.cardId);
    });
    const [mismatchA, mismatchB] = [round.cards[0], round.cards.find((card) => card.creatureId !== round.cards[0].creatureId)];

    let current = round;
    // Deliberately mismatch the same two (always-reset-to-hidden) cards
    // repeatedly, to blow well past softAttemptLimit before ever matching --
    // exceeding the soft limit must never prevent the board from being
    // completed (PRD: "límites suaves de intentos que nunca bloquean el
    // avance").
    while (!current.softLimitReached) {
      current = revealCard(current, mismatchA.cardId);
      current = revealCard(current, mismatchB.cardId);
      current = resolveSelection(current);
    }
    expect(current.attempts).toBeGreaterThanOrEqual(current.softAttemptLimit);
    expect(current.status).toBe('playing');

    Object.values(byCreature).forEach(([first, second]) => {
      current = revealCard(current, first);
      current = revealCard(current, second);
      current = resolveSelection(current);
    });

    expect(current.status).toBe('completed');
    expect(current.matchedPairs).toBe(current.pairCount);
  });
});

describe('evaluateRound / completeRound', () => {
  test('evaluateRound always scores the mode\'s own progress as a success, exactly once', () => {
    const round = startRound({ roundIndex: 0, level: 1, seed: 's', dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0 });
    const byCreature = {};
    round.cards.forEach((card) => (byCreature[card.creatureId] = byCreature[card.creatureId] || []).push(card.cardId));
    let current = round;
    Object.values(byCreature).forEach(([a, b]) => {
      current = revealCard(current, a);
      current = revealCard(current, b);
      current = resolveSelection(current);
    });

    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const first = evaluateRound(current, gameState);
    expect(first.round.evaluated).toBe(true);
    expect(first.gameState.score).toBe(1);
    expect(first.gameState.answers[0].isCorrect).toBe(true);

    const second = evaluateRound(first.round, first.gameState);
    expect(second.gameState.score).toBe(1);
    expect(second.gameState.answers).toHaveLength(1);
  });

  test('completeRound ends the game once ROUNDS_PER_GAME rounds are scored, otherwise starts the next one', () => {
    const round = startRound({ roundIndex: ROUNDS_PER_GAME - 1, level: 1, seed: 's', dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0 });
    const completed = Object.assign({}, round, { status: 'completed', matchedPairs: round.pairCount });

    const result = completeRound({
      round: completed,
      gameState: { score: ROUNDS_PER_GAME - 1, questionIndex: ROUNDS_PER_GAME - 1, answers: [] },
      level: 1,
      seed: 's',
      dinosaurPool: DEFAULT_DINOSAUR_POOL,
    });

    expect(result.gameOver).toBe(true);
    expect(result.state.score).toBe(ROUNDS_PER_GAME);
    expect(result.nextRound).toBeUndefined();
  });
});

describe('startGame', () => {
  test('is blocked with a machine-readable cause when the catalog has too few creatures', () => {
    const result = startGame({ level: 1, seed: 's', dinosaurPool: ['trex', 'triceratops'] });
    expect(result.error).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES);
  });

  test('returns a fresh state and the first of ROUNDS_PER_GAME rounds when the catalog is sufficient', () => {
    const game = startGame({ level: 1, seed: 's', dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0 });
    expect(game.state).toEqual({ score: 0, questionIndex: 0, answers: [] });
    expect(game.round.roundIndex).toBe(0);
    expect(game.round.error).toBeUndefined();
  });
});

describe('completeLevel: the level-unlock chain', () => {
  test('unlocks the next level once enough rounds are acertadas (not exceeding the soft limit), chaining a fresh board', () => {
    const answers = Array.from({ length: 10 }, () => ({ isCorrect: true, softLimitReached: false }));
    const outcome = completeLevel({ level: 1, answers, dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0.4 });

    expect(outcome.gameOver).toBe(false);
    expect(outcome.nextLevel).toBe(2);
    expect(outcome.correctCount).toBe(10);
    expect(outcome.nextLevelGame.error).toBeUndefined();
    expect(outcome.nextLevelGame.round.level).toBe(2);
  });

  test('a round completed after exceeding the soft limit never counts toward the common aciertos tally', () => {
    const answers = Array.from({ length: 10 }, () => ({ isCorrect: true, softLimitReached: true }));
    const outcome = completeLevel({ level: 1, answers, dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0.4 });

    expect(outcome.correctCount).toBe(0);
    expect(outcome.gameOver).toBe(true);
    expect(outcome.reason).toBe('insufficient_score');
  });

  test('always ends the game at the max level', () => {
    const answers = Array.from({ length: 10 }, () => ({ isCorrect: true, softLimitReached: false }));
    const outcome = completeLevel({ level: 10, answers, dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0.4 });

    expect(outcome.gameOver).toBe(true);
    expect(outcome.reason).toBe('completed_all_levels');
  });
});

describe('a full 10-round level, played end to end', () => {
  test('plays 10 rounds, ending game over with a full score, never generating an 11th round', () => {
    let game = startGame({ level: 1, seed: 'integration-seed', dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0.5 });
    let { state } = game;
    let round = game.round;
    let result;

    for (let i = 0; i < ROUNDS_PER_GAME; i += 1) {
      expect(round.error).toBeUndefined();

      const byCreature = {};
      round.cards.forEach((card) => (byCreature[card.creatureId] = byCreature[card.creatureId] || []).push(card.cardId));
      let current = round;
      Object.values(byCreature).forEach(([a, b]) => {
        current = revealCard(current, a);
        current = revealCard(current, b);
        current = resolveSelection(current);
      });
      expect(current.status).toBe('completed');

      result = completeRound({
        round: current,
        gameState: state,
        level: 1,
        seed: 'integration-seed',
        dinosaurPool: DEFAULT_DINOSAUR_POOL,
        randomFn: () => 0.5,
      });
      state = result.state;
      round = result.nextRound;
    }

    expect(result.gameOver).toBe(true);
    expect(round).toBeUndefined();
    expect(state.score).toBe(ROUNDS_PER_GAME);
    expect(state.answers).toHaveLength(ROUNDS_PER_GAME);

    const outcome = completeLevel({ level: 1, answers: state.answers, dinosaurPool: DEFAULT_DINOSAUR_POOL, randomFn: () => 0.5 });
    expect(outcome.correctCount).toBe(ROUNDS_PER_GAME);
  });
});
