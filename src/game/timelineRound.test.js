'use strict';

const {
  ROUNDS_PER_GAME,
  MODE_ID,
  PERIODS,
  DIAGNOSTIC_CODES,
  ERRORS,
  isValidPeriod,
  isValidClassification,
  ineligibilityReason,
  isEligibleCreature,
  selectEligibleCreatures,
  startRound,
  resolveVerifiedTimelineFicha,
  evaluateRound,
  startGame,
  completeRound,
} = require('./timelineRound');
const { DINOSAURS, VALID_DINOSAURS } = require('../data/questionBank');
const { PERIODS: SHEET_PERIODS, CLASSIFICATIONS, getCreatureSheet } = require('../data/creatureSheet');
const { LogService } = require('../services/logging');

function makeStorage() {
  const store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
  };
}

function buildRound(overrides = {}) {
  return {
    roundIndex: 0,
    level: 1,
    dinosaur: DINOSAURS.TREX,
    status: 'playing',
    evaluated: false,
    ...overrides,
  };
}

describe('isValidPeriod / isValidClassification', () => {
  test('accept exactly the creature sheet PERIODS/CLASSIFICATIONS values', () => {
    Object.values(SHEET_PERIODS).forEach((period) => expect(isValidPeriod(period)).toBe(true));
    Object.values(CLASSIFICATIONS).forEach((classification) => expect(isValidClassification(classification)).toBe(true));
    expect(isValidPeriod('inventado')).toBe(false);
    expect(isValidClassification('inventado')).toBe(false);
  });
});

describe('ineligibilityReason / isEligibleCreature', () => {
  test('every shipped dinosaur is eligible today', () => {
    VALID_DINOSAURS.forEach((id) => {
      expect(ineligibilityReason(id)).toBeNull();
      expect(isEligibleCreature(id)).toBe(true);
    });
  });

  test('flags a missing ficha with a local diagnostic code instead of guessing', () => {
    expect(ineligibilityReason('unknown-creature')).toBe(DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET);
  });

  test('flags a ficha with no/invalid mainPeriod', () => {
    const getCreatureSheet = () => ({ id: 'broken', mainPeriod: undefined, classification: CLASSIFICATIONS.DINOSAURIO });
    expect(ineligibilityReason('broken', { getCreatureSheet })).toBe(DIAGNOSTIC_CODES.INVALID_MAIN_PERIOD);
  });

  test('flags a ficha with no/invalid classification', () => {
    const getCreatureSheet = () => ({ id: 'broken', mainPeriod: SHEET_PERIODS.JURASICO, classification: 'humano' });
    expect(ineligibilityReason('broken', { getCreatureSheet })).toBe(DIAGNOSTIC_CODES.INVALID_CLASSIFICATION);
  });
});

describe('selectEligibleCreatures', () => {
  test('keeps only eligible creatures and logs a discard code for each excluded one, without generating a round for them', () => {
    const storage = makeStorage();
    const logService = new LogService(storage);
    const pool = [DINOSAURS.TREX, 'unknown-creature', DINOSAURS.PTERANODON];

    const eligible = selectEligibleCreatures({ dinosaurPool: pool, logService });

    expect(eligible).toEqual([DINOSAURS.TREX, DINOSAURS.PTERANODON]);
    expect(logService.getRoundGenerationFailureCounts()).toEqual({
      [`${MODE_ID}:${DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET}`]: 1,
    });
  });

  test('defaults to the shipped dinosaur roster, all eligible', () => {
    expect(selectEligibleCreatures()).toEqual(VALID_DINOSAURS);
  });
});

describe('startRound', () => {
  test('rejects a roundIndex outside 0..ROUNDS_PER_GAME-1', () => {
    expect(() => startRound({ roundIndex: -1, level: 1, dinosaur: DINOSAURS.TREX })).toThrow();
    expect(() => startRound({ roundIndex: ROUNDS_PER_GAME, level: 1, dinosaur: DINOSAURS.TREX })).toThrow();
  });

  test('requires a dinosaur id', () => {
    expect(() => startRound({ roundIndex: 0, level: 1 })).toThrow();
  });

  test('returns a playable round that leaks neither the period nor the classification', () => {
    const round = startRound({ roundIndex: 0, level: 1, dinosaur: DINOSAURS.TREX });

    expect(round.status).toBe('playing');
    expect(round.evaluated).toBe(false);
    expect(round.dinosaur).toBe(DINOSAURS.TREX);
    expect(round.mainPeriod).toBeUndefined();
    expect(round.classification).toBeUndefined();
    expect(round.explanation).toBeUndefined();
  });
});

describe('resolveVerifiedTimelineFicha', () => {
  test('resolves period/classification/precise interval exclusively from the creature single verified card', () => {
    expect(resolveVerifiedTimelineFicha(DINOSAURS.TREX)).toEqual({
      mainPeriod: SHEET_PERIODS.CRETACICO,
      classification: CLASSIFICATIONS.DINOSAURIO,
      temporalRangeMillionsOfYears: { startMya: 68, endMya: 66 },
    });
  });

  test('Pteranodon resolves as a flying reptile, not a dinosaur', () => {
    expect(resolveVerifiedTimelineFicha(DINOSAURS.PTERANODON).classification).toBe(CLASSIFICATIONS.REPTIL_VOLADOR);
  });

  test('returns null (not a fabricated range) when no precise interval is documented', () => {
    expect(resolveVerifiedTimelineFicha(DINOSAURS.TRICERATOPS).temporalRangeMillionsOfYears).toBeNull();
  });

  test('flags a missing ficha with a local diagnostic code instead of guessing', () => {
    expect(resolveVerifiedTimelineFicha('unknown-creature')).toEqual({ error: DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET });
  });
});

describe('evaluateRound', () => {
  test('throws when the round is not playing', () => {
    const round = buildRound({ status: 'blocked' });
    expect(() => evaluateRound(round, { score: 0, questionIndex: 0, answers: [] }, PERIODS[0])).toThrow();
  });

  test('rejects a periodGuess outside triasico/jurasico/cretacico', () => {
    const round = buildRound();
    expect(() => evaluateRound(round, { score: 0, questionIndex: 0, answers: [] }, 'edad-media')).toThrow();
  });

  test('scores a correct guess, appends its answer entry and attaches the explanation', () => {
    const round = buildRound({ dinosaur: DINOSAURS.TREX });
    const gameState = { score: 0, questionIndex: 0, answers: [] };

    const result = evaluateRound(round, gameState, SHEET_PERIODS.CRETACICO);

    expect(result.round.status).toBe('completed');
    expect(result.round.evaluated).toBe(true);
    expect(result.round.isCorrect).toBe(true);
    expect(result.round.explanation).toEqual({
      mainPeriod: SHEET_PERIODS.CRETACICO,
      temporalRangeMillionsOfYears: { startMya: 68, endMya: 66 },
      classification: CLASSIFICATIONS.DINOSAURIO,
    });
    expect(result.gameState.score).toBe(1);
    expect(result.gameState.questionIndex).toBe(1);
    expect(result.gameState.answers).toEqual([
      {
        roundIndex: 0,
        dinosaur: DINOSAURS.TREX,
        mainPeriod: SHEET_PERIODS.CRETACICO,
        periodGuess: SHEET_PERIODS.CRETACICO,
        isCorrect: true,
      },
    ]);
  });

  test('the classification explanation states Pteranodon as a flying reptile, not a dinosaur', () => {
    const round = buildRound({ dinosaur: DINOSAURS.PTERANODON });
    const gameState = { score: 0, questionIndex: 0, answers: [] };

    const result = evaluateRound(round, gameState, SHEET_PERIODS.CRETACICO);

    expect(result.round.explanation.classification).toBe(CLASSIFICATIONS.REPTIL_VOLADOR);
  });

  test('scores an incorrect guess without awarding a point', () => {
    const round = buildRound({ dinosaur: DINOSAURS.TREX });
    const gameState = { score: 0, questionIndex: 0, answers: [] };

    const result = evaluateRound(round, gameState, SHEET_PERIODS.JURASICO);

    expect(result.round.isCorrect).toBe(false);
    expect(result.gameState.score).toBe(0);
    expect(result.gameState.answers[0].isCorrect).toBe(false);
  });

  test('a second evaluation of the same round is a no-op (never double-counts)', () => {
    const round = buildRound({ dinosaur: DINOSAURS.TREX });
    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const first = evaluateRound(round, gameState, SHEET_PERIODS.CRETACICO);

    const second = evaluateRound(first.round, first.gameState, SHEET_PERIODS.JURASICO);

    expect(second.round).toBe(first.round);
    expect(second.gameState).toBe(first.gameState);
    expect(second.gameState.score).toBe(1);
    expect(second.gameState.answers).toHaveLength(1);
  });

  test('blocks only the affected round when the ficha can no longer be verified, without scoring it', () => {
    const round = buildRound({ dinosaur: 'unknown-creature' });
    const gameState = { score: 3, questionIndex: 3, answers: [] };
    const storage = makeStorage();
    const logService = new LogService(storage);

    const result = evaluateRound(round, gameState, SHEET_PERIODS.CRETACICO, { logService });

    expect(result.round.status).toBe('blocked');
    expect(result.round.evaluated).toBe(true);
    expect(result.round.diagnosticCode).toBe(DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET);
    expect(result.gameState).toBe(gameState);
    expect(result.gameState.answers).toHaveLength(0);
    expect(logService.getRoundGenerationFailureCounts()).toEqual({
      [`${MODE_ID}:${DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET}`]: 1,
    });
  });
});

describe('startGame', () => {
  test('rejects an invalid level', () => {
    expect(() => startGame({ level: 0 })).toThrow();
    expect(() => startGame({ level: 11 })).toThrow();
  });

  test('returns a fresh state, an order of ROUNDS_PER_GAME distinct eligible creatures, and the first round', () => {
    const game = startGame({ level: 1, randomFn: () => 0 });

    expect(game.state).toEqual({ score: 0, questionIndex: 0, answers: [] });
    expect(game.order).toHaveLength(ROUNDS_PER_GAME);
    expect(new Set(game.order).size).toBe(ROUNDS_PER_GAME);
    game.order.forEach((id) => expect(isEligibleCreature(id)).toBe(true));
    expect(game.round.roundIndex).toBe(0);
    expect(game.round.status).toBe('playing');
    expect(game.round.dinosaur).toBe(game.order[0]);
  });

  test('exposes the mode-specific blocking state when there are fewer than ROUNDS_PER_GAME eligible creatures', () => {
    const game = startGame({ level: 1, dinosaurPool: [DINOSAURS.TREX, DINOSAURS.TRICERATOPS, 'unknown-creature'] });

    expect(game).toEqual({
      error: ERRORS.INSUFFICIENT_ELIGIBLE_CREATURES,
      details: { need: ROUNDS_PER_GAME, have: 2 },
    });
  });
});

describe('completeRound', () => {
  test('ends the game once ROUNDS_PER_GAME rounds are answered', () => {
    const round = buildRound({ roundIndex: ROUNDS_PER_GAME - 1, dinosaur: DINOSAURS.TREX });
    const gameState = { score: ROUNDS_PER_GAME - 1, questionIndex: ROUNDS_PER_GAME - 1, answers: [] };

    const result = completeRound({ round, gameState, level: 1, periodGuess: SHEET_PERIODS.CRETACICO });

    expect(result.gameOver).toBe(true);
    expect(result.state.score).toBe(ROUNDS_PER_GAME);
    expect(result.nextRound).toBeUndefined();
  });

  test('otherwise scores the round and starts the next one for order[nextRoundIndex]', () => {
    const round = buildRound({ dinosaur: DINOSAURS.TREX });
    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const order = [DINOSAURS.TREX, DINOSAURS.TRICERATOPS];

    const result = completeRound({ round, gameState, level: 1, order, periodGuess: SHEET_PERIODS.CRETACICO });

    expect(result.gameOver).toBe(false);
    expect(result.nextRound.roundIndex).toBe(1);
    expect(result.nextRound.dinosaur).toBe(DINOSAURS.TRICERATOPS);
  });
});

describe('a full 10-round game, played end to end', () => {
  test('plays 10 rounds over 10 distinct creatures, each answer counted exactly once', () => {
    const game = startGame({ level: 1, randomFn: () => 0.5 });
    let state = game.state;
    let round = game.round;
    let result;
    const seenDinosaurs = [];

    for (let i = 0; i < ROUNDS_PER_GAME; i += 1) {
      seenDinosaurs.push(round.dinosaur);
      const mainPeriod = getCreatureSheet(round.dinosaur).mainPeriod;

      result = completeRound({ round, gameState: state, level: 1, order: game.order, periodGuess: mainPeriod });
      state = result.state;
      round = result.nextRound;
    }

    expect(result.gameOver).toBe(true);
    expect(state.score).toBe(ROUNDS_PER_GAME);
    expect(state.answers).toHaveLength(ROUNDS_PER_GAME);
    expect(new Set(seenDinosaurs).size).toBe(ROUNDS_PER_GAME);
  });
});

test('MODE_ID matches the modesCatalog Línea del tiempo mode id', () => {
  expect(MODE_ID).toBe('lineaDelTiempo');
});
