'use strict';

const {
  ROUNDS_PER_GAME,
  MODE_ID,
  MIN_PAIRS,
  MAX_PAIRS,
  MIN_CARDS,
  MAX_CARDS,
  MAX_COLUMNS,
  MAX_VISIBLE_UNMATCHED,
  CARD_STATES,
  DIFFICULTY_BIAS,
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
} = require('./parejasGame');
const { DINOSAURS, VALID_DINOSAURS } = require('../data/questionBank');
const { AVAILABILITY_CAUSES } = require('./modesCatalog');

const FAMILIES = {
  [DINOSAURS.TREX]: 'biped_carnivore',
  [DINOSAURS.VELOCIRAPTOR]: 'biped_carnivore',
  [DINOSAURS.SPINOSAURUS]: 'biped_carnivore',
  [DINOSAURS.DILOPHOSAURUS]: 'biped_carnivore',
  [DINOSAURS.COMPSOGNATHUS]: 'biped_carnivore',
  [DINOSAURS.TRICERATOPS]: 'armored_quadruped',
  [DINOSAURS.ESTEGOSAURIO]: 'armored_quadruped',
  [DINOSAURS.ANKYLOSAURUS]: 'armored_quadruped',
  [DINOSAURS.BRAQUIOSAURIO]: 'long_neck_quadruped',
  [DINOSAURS.DIPLODOCUS]: 'long_neck_quadruped',
  [DINOSAURS.PACHYCEPHALOSAURUS]: 'biped_herbivore',
  [DINOSAURS.IGUANODON]: 'biped_herbivore',
  [DINOSAURS.PARASAUROLOPHUS]: 'biped_herbivore',
  [DINOSAURS.PTERANODON]: 'flying_reptile',
};

function stubVisualFamily(id) {
  return FAMILIES[id];
}

function buildBoardRound(overrides = {}) {
  const cards = [
    { cardId: 0, creatureId: DINOSAURS.TREX, pairId: 0, state: CARD_STATES.HIDDEN, position: { row: 0, col: 0 } },
    { cardId: 1, creatureId: DINOSAURS.TRICERATOPS, pairId: 1, state: CARD_STATES.HIDDEN, position: { row: 0, col: 1 } },
    { cardId: 2, creatureId: DINOSAURS.TREX, pairId: 0, state: CARD_STATES.HIDDEN, position: { row: 0, col: 2 } },
    { cardId: 3, creatureId: DINOSAURS.TRICERATOPS, pairId: 1, state: CARD_STATES.HIDDEN, position: { row: 0, col: 3 } },
  ];

  return {
    roundIndex: 0,
    level: 1,
    seed: 'fixed:0',
    pairCount: 2,
    columns: 4,
    rows: 1,
    cards,
    revealedCardIds: [],
    matchedPairs: 0,
    attempts: 0,
    mismatches: 0,
    softAttemptLimit: 4,
    softLimitReached: false,
    status: 'playing',
    blocked: false,
    evaluated: false,
    ...overrides,
  };
}

describe('validateCatalog', () => {
  test('blocks Parejas with a machine-readable cause when the catalog has fewer than 8 creatures', () => {
    const catalog = { questionsCount: 0, creatures: Array.from({ length: 7 }, (_, i) => ({ id: `c${i}` })) };
    const result = validateCatalog({ catalog });

    expect(result.modeId).toBe(MODE_ID);
    expect(result.available).toBe(false);
    expect(result.cause).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES);
    expect(result.details).toEqual({ need: 8, have: 7 });
  });

  test('is available with exactly 8 creatures', () => {
    const catalog = { questionsCount: 0, creatures: Array.from({ length: 8 }, (_, i) => ({ id: `c${i}` })) };
    expect(validateCatalog({ catalog })).toEqual({ modeId: MODE_ID, available: true, cause: null, details: null });
  });

  test('defaults to the real shipped creature roster (14 creatures, always available today)', () => {
    expect(validateCatalog({}).available).toBe(true);
  });

  test('a duplicated id in dinosaurPool only counts once toward the >=8 gate', () => {
    const eightUniquePlusOneDuplicate = [...VALID_DINOSAURS.slice(0, 8), VALID_DINOSAURS[0]];
    const sevenUniquePlusOneDuplicate = [...VALID_DINOSAURS.slice(0, 7), VALID_DINOSAURS[0]];

    expect(validateCatalog({ dinosaurPool: eightUniquePlusOneDuplicate }).available).toBe(true);
    expect(validateCatalog({ dinosaurPool: sevenUniquePlusOneDuplicate }).available).toBe(false);
  });

  test('an invalid or imageless id in dinosaurPool never counts toward the >=8 gate', () => {
    const sevenRealPlusGarbage = [...VALID_DINOSAURS.slice(0, 7), 'not-a-real-dinosaur', '', null];
    const result = validateCatalog({ dinosaurPool: sevenRealPlusGarbage });

    expect(result.available).toBe(false);
    expect(result.cause).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES);
    expect(result.details).toEqual({ need: 8, have: 7 });
  });
});

describe('hasUsableCardImage / eligibleCardCreatureIds', () => {
  test('every shipped dinosaur has a real, usable card-front image', () => {
    VALID_DINOSAURS.forEach((id) => {
      expect(hasUsableCardImage(id)).toBe(true);
    });
  });

  test('rejects invalid ids without touching the filesystem check', () => {
    expect(hasUsableCardImage('not-a-real-dinosaur')).toBe(false);
    expect(hasUsableCardImage('')).toBe(false);
    expect(hasUsableCardImage(null)).toBe(false);
    expect(hasUsableCardImage(undefined)).toBe(false);
  });

  test('dedupes and drops invalid/imageless ids, preserving first-seen order', () => {
    const pool = [DINOSAURS.TREX, 'bogus', DINOSAURS.TRICERATOPS, DINOSAURS.TREX];
    expect(eligibleCardCreatureIds(pool)).toEqual([DINOSAURS.TREX, DINOSAURS.TRICERATOPS]);
  });
});

describe('pairCountForLevel', () => {
  test('rejects an invalid level', () => {
    expect(() => pairCountForLevel(0)).toThrow();
    expect(() => pairCountForLevel(11)).toThrow();
  });

  test('scales from MIN_PAIRS at level 1 to MAX_PAIRS at level 10, monotonically non-decreasing', () => {
    expect(pairCountForLevel(1)).toBe(MIN_PAIRS);
    expect(pairCountForLevel(10)).toBe(MAX_PAIRS);

    let previous = 0;
    for (let level = 1; level <= 10; level += 1) {
      const pairCount = pairCountForLevel(level);
      expect(pairCount).toBeGreaterThanOrEqual(previous);
      expect(pairCount).toBeGreaterThanOrEqual(MIN_PAIRS);
      expect(pairCount).toBeLessThanOrEqual(MAX_PAIRS);
      previous = pairCount;
    }
  });
});

describe('computeColumns', () => {
  test('never exceeds MAX_COLUMNS (PRD: 375px width)', () => {
    expect(computeColumns(MIN_CARDS)).toBeLessThanOrEqual(MAX_COLUMNS);
    expect(computeColumns(MAX_CARDS)).toBe(MAX_COLUMNS);
  });

  test('never exceeds the card count itself for a smaller board', () => {
    expect(computeColumns(2)).toBe(2);
  });
});

describe('softAttemptLimitForLevel', () => {
  test('is generous at level 1 and tightens to exactly pairCount at the top level', () => {
    const pairCount = pairCountForLevel(1);
    expect(softAttemptLimitForLevel(1, pairCount)).toBeGreaterThan(pairCount);

    const topPairCount = pairCountForLevel(10);
    expect(softAttemptLimitForLevel(10, topPairCount)).toBe(topPairCount);
  });
});

describe('difficultyBiasForLevel', () => {
  test('is diverse below the similarity threshold and similar at/above it', () => {
    expect(difficultyBiasForLevel(1)).toBe(DIFFICULTY_BIAS.DIVERSE);
    expect(difficultyBiasForLevel(6)).toBe(DIFFICULTY_BIAS.DIVERSE);
    expect(difficultyBiasForLevel(7)).toBe(DIFFICULTY_BIAS.SIMILAR);
    expect(difficultyBiasForLevel(10)).toBe(DIFFICULTY_BIAS.SIMILAR);
  });
});

describe('selectCreaturesForBoard', () => {
  test('rejects a pairCount outside MIN_PAIRS..MAX_PAIRS', () => {
    expect(() => selectCreaturesForBoard({ pairCount: MIN_PAIRS - 1, level: 1 })).toThrow();
    expect(() => selectCreaturesForBoard({ pairCount: MAX_PAIRS + 1, level: 1 })).toThrow();
  });

  test('throws instead of silently reusing a creature when the pool is too small', () => {
    expect(() =>
      selectCreaturesForBoard({ pairCount: 4, level: 1, dinosaurPool: [DINOSAURS.TREX, DINOSAURS.TRICERATOPS] })
    ).toThrow();
  });

  test('returns pairCount distinct creatures from the pool', () => {
    const creatures = selectCreaturesForBoard({
      pairCount: 6,
      level: 1,
      dinosaurPool: VALID_DINOSAURS,
      randomFn: () => 0,
      getCreatureVisualFamily: stubVisualFamily,
    });

    expect(creatures).toHaveLength(6);
    expect(new Set(creatures).size).toBe(6);
    creatures.forEach((id) => expect(VALID_DINOSAURS).toContain(id));
  });

  test('below the similarity threshold, a full board never draws every creature from a single family', () => {
    const creatures = selectCreaturesForBoard({
      pairCount: 5,
      level: 1,
      dinosaurPool: VALID_DINOSAURS,
      randomFn: () => 0,
      getCreatureVisualFamily: stubVisualFamily,
    });

    const families = new Set(creatures.map(stubVisualFamily));
    expect(families.size).toBeGreaterThan(1);
  });

  test('at/above the similarity threshold, the board clusters around the largest visual family first', () => {
    const creatures = selectCreaturesForBoard({
      pairCount: 5,
      level: 10,
      dinosaurPool: VALID_DINOSAURS,
      randomFn: () => 0,
      getCreatureVisualFamily: stubVisualFamily,
    });

    // biped_carnivore is the largest family (5 members): a 5-pair board
    // biased toward similarity should be exactly that family.
    creatures.forEach((id) => expect(stubVisualFamily(id)).toBe('biped_carnivore'));
  });
});

describe('startRound', () => {
  test('rejects a roundIndex outside 0..ROUNDS_PER_GAME-1', () => {
    expect(() => startRound({ roundIndex: -1, level: 1, seed: 's' })).toThrow();
    expect(() => startRound({ roundIndex: ROUNDS_PER_GAME, level: 1, seed: 's' })).toThrow();
  });

  test('rejects an invalid level', () => {
    expect(() => startRound({ roundIndex: 0, level: 0, seed: 's' })).toThrow();
  });

  test('builds an all-hidden board of complete pairs, at most MAX_COLUMNS wide', () => {
    const round = startRound({ roundIndex: 0, level: 1, seed: 'seed-1', randomFn: () => 0 });

    expect(round.roundIndex).toBe(0);
    expect(round.status).toBe('playing');
    expect(round.evaluated).toBe(false);
    expect(round.matchedPairs).toBe(0);
    expect(round.cards.length).toBe(round.pairCount * 2);
    expect(round.cards.length).toBeGreaterThanOrEqual(MIN_CARDS);
    expect(round.cards.length).toBeLessThanOrEqual(MAX_CARDS);
    expect(round.columns).toBeLessThanOrEqual(MAX_COLUMNS);
    expect(round.rows).toBe(Math.ceil(round.cards.length / round.columns));

    round.cards.forEach((card) => {
      expect(card.state).toBe(CARD_STATES.HIDDEN);
      expect(VALID_DINOSAURS).toContain(card.creatureId);
      expect(card.position.row).toBeGreaterThanOrEqual(0);
      expect(card.position.col).toBeGreaterThanOrEqual(0);
      expect(card.position.col).toBeLessThan(round.columns);
    });

    const pairTally = new Map();
    round.cards.forEach((card) => pairTally.set(card.pairId, (pairTally.get(card.pairId) || 0) + 1));
    expect([...pairTally.values()].every((count) => count === 2)).toBe(true);
  });

  test('a higher level produces at least as many pairs as a lower one', () => {
    const low = startRound({ roundIndex: 0, level: 1, seed: 'seed-1', randomFn: () => 0 });
    const high = startRound({ roundIndex: 0, level: 10, seed: 'seed-1', randomFn: () => 0 });

    expect(high.pairCount).toBeGreaterThanOrEqual(low.pairCount);
  });
});

describe('revealCard', () => {
  test('flips a hidden card face up', () => {
    const round = buildBoardRound();
    const revealed = revealCard(round, 0);

    expect(revealed.cards[0].state).toBe(CARD_STATES.REVEALED);
    expect(revealed.revealedCardIds).toEqual([0]);
    expect(revealed.blocked).toBe(false);
  });

  test('is a no-op on an already-revealed or matched card', () => {
    const round = revealCard(buildBoardRound(), 0);
    const revealedAgain = revealCard(round, 0);
    expect(revealedAgain).toBe(round);

    const matchedRound = buildBoardRound({
      cards: buildBoardRound().cards.map((card) => (card.cardId === 0 ? { ...card, state: CARD_STATES.MATCHED } : card)),
    });
    expect(revealCard(matchedRound, 0)).toBe(matchedRound);
  });

  test('enforces the hard limit: a third reveal is blocked while two unmatched cards are already face up', () => {
    let round = revealCard(buildBoardRound(), 0);
    round = revealCard(round, 1);
    expect(round.revealedCardIds).toEqual([0, 1]);

    const thirdAttempt = revealCard(round, 2);
    expect(thirdAttempt.blocked).toBe(true);
    expect(thirdAttempt.cards[2].state).toBe(CARD_STATES.HIDDEN);
    expect(thirdAttempt.revealedCardIds).toEqual([0, 1]);
  });

  test('is a no-op once the round is no longer playing', () => {
    const completed = buildBoardRound({ status: 'completed' });
    expect(revealCard(completed, 0)).toBe(completed);
  });
});

describe('resolveSelection', () => {
  test('is a no-op unless exactly MAX_VISIBLE_UNMATCHED cards are revealed', () => {
    const round = buildBoardRound();
    expect(resolveSelection(round)).toBe(round);

    const oneRevealed = revealCard(round, 0);
    expect(resolveSelection(oneRevealed)).toBe(oneRevealed);
  });

  test('a match flips both cards to matched and tallies matchedPairs', () => {
    let round = revealCard(buildBoardRound(), 0);
    round = revealCard(round, 2); // same creature as card 0

    const resolved = resolveSelection(round);

    expect(resolved.cards[0].state).toBe(CARD_STATES.MATCHED);
    expect(resolved.cards[2].state).toBe(CARD_STATES.MATCHED);
    expect(resolved.matchedPairs).toBe(1);
    expect(resolved.attempts).toBe(1);
    expect(resolved.mismatches).toBe(0);
    expect(resolved.revealedCardIds).toEqual([]);
    expect(resolved.lastMatch).toBe(true);
    expect(resolved.status).toBe('playing');
  });

  test('a mismatch flips both cards back to hidden without matching', () => {
    let round = revealCard(buildBoardRound(), 0);
    round = revealCard(round, 1); // different creature

    const resolved = resolveSelection(round);

    expect(resolved.cards[0].state).toBe(CARD_STATES.HIDDEN);
    expect(resolved.cards[1].state).toBe(CARD_STATES.HIDDEN);
    expect(resolved.matchedPairs).toBe(0);
    expect(resolved.attempts).toBe(1);
    expect(resolved.mismatches).toBe(1);
    expect(resolved.lastMatch).toBe(false);
  });

  test('a mismatch never blocks further reveals (soft attempt limit only informs, never blocks)', () => {
    let round = revealCard(buildBoardRound({ softAttemptLimit: 1 }), 0);
    round = revealCard(round, 1);
    round = resolveSelection(round);

    expect(round.softLimitReached).toBe(true);
    expect(round.status).toBe('playing');

    const revealedAfterLimit = revealCard(round, 2);
    expect(revealedAfterLimit.blocked).toBe(false);
    expect(revealedAfterLimit.cards[2].state).toBe(CARD_STATES.REVEALED);
  });

  test('matching every pair flips the round to completed', () => {
    let round = revealCard(buildBoardRound(), 0);
    round = revealCard(round, 2);
    round = resolveSelection(round);

    round = revealCard(round, 1);
    round = revealCard(round, 3);
    round = resolveSelection(round);

    expect(round.matchedPairs).toBe(round.pairCount);
    expect(round.status).toBe('completed');
  });
});

describe('evaluateRound', () => {
  test('throws when the round has not completed yet', () => {
    expect(() => evaluateRound(buildBoardRound(), { score: 0, questionIndex: 0, answers: [] })).toThrow();
  });

  test('scores the round once and appends its answer entry', () => {
    const round = buildBoardRound({ status: 'completed', matchedPairs: 2, attempts: 3, mismatches: 1 });
    const gameState = { score: 0, questionIndex: 0, answers: [] };

    const result = evaluateRound(round, gameState);

    expect(result.round.evaluated).toBe(true);
    expect(result.gameState.score).toBe(1);
    expect(result.gameState.questionIndex).toBe(1);
    expect(result.gameState.answers).toEqual([
      { roundIndex: 0, pairCount: 2, attempts: 3, mismatches: 1, softLimitReached: false, isCorrect: true },
    ]);
  });

  test('a second evaluation of the same round is a no-op (never double-scores)', () => {
    const round = buildBoardRound({ status: 'completed' });
    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const first = evaluateRound(round, gameState);

    const second = evaluateRound(first.round, first.gameState);

    expect(second.gameState.score).toBe(1);
    expect(second.gameState.answers).toHaveLength(1);
  });
});

describe('startGame', () => {
  test('rejects an invalid level', () => {
    expect(() => startGame({ level: 0, seed: 's' })).toThrow();
    expect(() => startGame({ level: 11, seed: 's' })).toThrow();
  });

  test('is blocked with a machine-readable cause when the catalog has too few creatures', () => {
    const result = startGame({ level: 1, seed: 's', dinosaurPool: [DINOSAURS.TREX, DINOSAURS.TRICERATOPS] });
    expect(result.error).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES);
    expect(result.details).toEqual({ need: 8, have: 2 });
  });

  test('returns a fresh state and the first of ROUNDS_PER_GAME rounds when the catalog is sufficient', () => {
    const game = startGame({ level: 1, seed: 'seed-1', dinosaurPool: VALID_DINOSAURS, randomFn: () => 0 });

    expect(game.state).toEqual({ score: 0, questionIndex: 0, answers: [] });
    expect(game.round.roundIndex).toBe(0);
    expect(game.round.error).toBeUndefined();
  });
});

describe('completeRound', () => {
  function completedRound(overrides = {}) {
    return buildBoardRound({ status: 'completed', matchedPairs: 2, ...overrides });
  }

  test('ends the game once ROUNDS_PER_GAME rounds are scored', () => {
    const round = completedRound({ roundIndex: ROUNDS_PER_GAME - 1 });
    const gameState = { score: ROUNDS_PER_GAME - 1, questionIndex: ROUNDS_PER_GAME - 1, answers: [] };

    const result = completeRound({ round, gameState, level: 1, seed: 'seed-1', dinosaurPool: VALID_DINOSAURS });

    expect(result.gameOver).toBe(true);
    expect(result.state.score).toBe(ROUNDS_PER_GAME);
    expect(result.nextRound).toBeUndefined();
  });

  test('otherwise scores the round and starts the next one', () => {
    const round = completedRound();
    const gameState = { score: 0, questionIndex: 0, answers: [] };

    const result = completeRound({
      round,
      gameState,
      level: 1,
      seed: 'seed-1',
      dinosaurPool: VALID_DINOSAURS,
      randomFn: () => 0,
    });

    expect(result.gameOver).toBe(false);
    expect(result.nextRound.roundIndex).toBe(1);
    expect(result.state.score).toBe(1);
  });
});

describe('a full 10-round game, played end to end', () => {
  function playRoundToCompletion(round) {
    const byCreature = new Map();
    round.cards.forEach((card) => {
      if (!byCreature.has(card.creatureId)) {
        byCreature.set(card.creatureId, []);
      }
      byCreature.get(card.creatureId).push(card.cardId);
    });

    let current = round;
    byCreature.forEach(([firstCardId, secondCardId]) => {
      current = revealCard(current, firstCardId);
      current = revealCard(current, secondCardId);
      current = resolveSelection(current);
    });
    return current;
  }

  test('plays 10 rounds, ending game over with a full score', () => {
    let game = startGame({ level: 1, seed: 'integration-seed', dinosaurPool: VALID_DINOSAURS, randomFn: () => 0.5 });
    let { state } = game;
    let round = game.round;
    let result;

    for (let i = 0; i < ROUNDS_PER_GAME; i += 1) {
      expect(round.error).toBeUndefined();

      const finished = playRoundToCompletion(round);
      expect(finished.status).toBe('completed');
      expect(finished.matchedPairs).toBe(finished.pairCount);

      result = completeRound({
        round: finished,
        gameState: state,
        level: 1,
        seed: 'integration-seed',
        dinosaurPool: VALID_DINOSAURS,
        randomFn: () => 0.5,
      });
      state = result.state;
      round = result.nextRound;
    }

    expect(result.gameOver).toBe(true);
    expect(state.score).toBe(ROUNDS_PER_GAME);
    expect(state.answers).toHaveLength(ROUNDS_PER_GAME);
  });
});

describe('completeLevel', () => {
  test('unlocks the next level once enough rounds are acertadas (not exceeding the soft limit), and chains a fresh set of rounds', () => {
    const answers = Array.from({ length: 10 }, () => ({ isCorrect: true, softLimitReached: false }));

    const outcome = completeLevel({ level: 1, answers, dinosaurPool: VALID_DINOSAURS, randomFn: () => 0.4 });

    expect(outcome.gameOver).toBe(false);
    expect(outcome.nextLevel).toBe(2);
    expect(outcome.correctCount).toBe(10);
    expect(outcome.nextLevelGame.error).toBeUndefined();
    expect(outcome.nextLevelGame.level).toBe(2);
    expect(outcome.nextLevelGame.round.roundIndex).toBe(0);
  });

  test('a round completed after exceeding the soft limit never counts as acertada for the unlock tally', () => {
    const answers = Array.from({ length: 10 }, () => ({ isCorrect: true, softLimitReached: true }));

    const outcome = completeLevel({ level: 1, answers, dinosaurPool: VALID_DINOSAURS, randomFn: () => 0.4 });

    expect(outcome.correctCount).toBe(0);
    expect(outcome.gameOver).toBe(true);
    expect(outcome.reason).toBe('insufficient_score');
  });

  test('ends the game with insufficient acertadas', () => {
    const answers = Array.from({ length: 10 }, () => ({ isCorrect: false, softLimitReached: false }));

    const outcome = completeLevel({ level: 1, answers, dinosaurPool: VALID_DINOSAURS, randomFn: () => 0.4 });

    expect(outcome.gameOver).toBe(true);
    expect(outcome.reason).toBe('insufficient_score');
  });

  test('always ends the game at the max level', () => {
    const answers = Array.from({ length: 10 }, () => ({ isCorrect: true, softLimitReached: false }));

    const outcome = completeLevel({ level: 10, answers, dinosaurPool: VALID_DINOSAURS, randomFn: () => 0.4 });

    expect(outcome.gameOver).toBe(true);
    expect(outcome.reason).toBe('completed_all_levels');
  });
});
