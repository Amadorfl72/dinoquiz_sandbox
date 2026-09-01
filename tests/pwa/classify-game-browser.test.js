'use strict';

const path = require('path');

const CLASSIFY_GAME_PATH = path.resolve(__dirname, '../../public/scripts/classifyGame.js');

const {
  ROUNDS_PER_GAME,
  MODE_ID,
  CATEGORIES,
  DIAGNOSTIC_CODES,
  DEFAULT_DINOSAUR_POOL,
  pickDinosaur,
  startRound,
  resolveVerifiedDiet,
  evaluateRound,
  startGame,
  completeRound,
} = require(CLASSIFY_GAME_PATH);
const { CREATURE_SHEETS, DIETS } = require('../../src/data/creatureSheet');
const { VALID_DINOSAURS } = require('../../src/data/questionBank');
const { MODE_IDS } = require('../../src/game/modesCatalog');

/**
 * TRIOFSND-281: public/scripts/classifyGame.js is the browser-runnable twin
 * of src/game/classifyGame.js (see that file's own doc comment for why it
 * can't just re-export it -- the real module's dependency chain requires
 * `fs`, which doesn't exist in a real, unbundled browser). Its local
 * `DINOSAUR_DIETS` mirrors src/data/creatureSheet.js/questionBank.js by
 * hand, so this guards against the two silently drifting apart, and
 * exercises the same round/game state machine
 * public/scripts/classifyScreen.js drives at runtime via
 * `window.DinoQuiz.game.classify`.
 */
describe('public/scripts/classifyGame.js mirrors the authoritative creature data', () => {
  test('DEFAULT_DINOSAUR_POOL matches the shipped dinosaur roster', () => {
    expect(DEFAULT_DINOSAUR_POOL.slice().sort()).toEqual(VALID_DINOSAURS.slice().sort());
  });

  test('resolveVerifiedDiet resolves the exact same diet as src/data/creatureSheet.js for every shipped dinosaur', () => {
    VALID_DINOSAURS.forEach((dinosaur) => {
      const sheet = CREATURE_SHEETS[dinosaur];
      expect(resolveVerifiedDiet(dinosaur)).toEqual({ diet: sheet.diet });
    });
  });

  test('CATEGORIES matches src/data/creatureSheet.js DIETS values', () => {
    expect(Object.values(CATEGORIES).slice().sort()).toEqual(Object.values(DIETS).slice().sort());
  });

  test('MODE_ID matches src/game/modesCatalog.js MODE_IDS.CLASIFICA', () => {
    expect(MODE_ID).toBe(MODE_IDS.CLASIFICA);
  });
});

describe('resolveVerifiedDiet', () => {
  test('resolves carnivoro/herbivoro exclusively from the local diet map', () => {
    expect(resolveVerifiedDiet('trex')).toEqual({ diet: 'carnivoro' });
    expect(resolveVerifiedDiet('triceratops')).toEqual({ diet: 'herbivoro' });
  });

  test('flags a missing ficha with a local diagnostic code instead of guessing', () => {
    expect(resolveVerifiedDiet('unknown-creature')).toEqual({ error: DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET });
  });

  test('flags a ficha whose diet is outside carnivoro/herbivoro/omnivoro, via an injected creature sheet', () => {
    const getCreatureSheet = () => ({ id: 'broken', diet: 'insectivoro' });
    expect(resolveVerifiedDiet('broken', { getCreatureSheet })).toEqual({ error: DIAGNOSTIC_CODES.INVALID_CREATURE_DIET });
  });
});

describe('pickDinosaur', () => {
  test('never repeats the previous round creature when the pool has another option', () => {
    const pool = ['trex', 'triceratops'];
    for (let i = 0; i < 20; i += 1) {
      const picked = pickDinosaur('trex', { dinosaurPool: pool, randomFn: () => i / 20 });
      expect(picked).toBe('triceratops');
    }
  });

  test('defaults to the shipped dinosaur roster', () => {
    const picked = pickDinosaur(null, { randomFn: () => 0 });
    expect(DEFAULT_DINOSAUR_POOL).toContain(picked);
  });
});

describe('startRound / evaluateRound', () => {
  test('startRound rejects a roundIndex outside 0..ROUNDS_PER_GAME-1', () => {
    expect(() => startRound({ roundIndex: -1, level: 1 })).toThrow();
    expect(() => startRound({ roundIndex: ROUNDS_PER_GAME, level: 1 })).toThrow();
  });

  test('startRound returns a playable round with a creature but no diet resolved yet', () => {
    const round = startRound({ roundIndex: 0, level: 1, randomFn: () => 0 });

    expect(round.status).toBe('playing');
    expect(round.evaluated).toBe(false);
    expect(round.diet).toBeUndefined();
    expect(DEFAULT_DINOSAUR_POOL).toContain(round.dinosaur);
  });

  test('scores a correct guess and appends its answer entry', () => {
    const round = startRound({ roundIndex: 0, level: 1, dinosaurPool: ['trex'], randomFn: () => 0 });
    const gameState = { score: 0, questionIndex: 0, answers: [] };

    const result = evaluateRound(round, gameState, 'carnivoro');

    expect(result.round.status).toBe('completed');
    expect(result.round.isCorrect).toBe(true);
    expect(result.gameState.score).toBe(1);
    expect(result.gameState.answers).toHaveLength(1);
  });

  test('blocks only the affected round when the ficha is missing, without scoring', () => {
    const round = startRound({ roundIndex: 0, level: 1, dinosaurPool: ['unknown-creature'], randomFn: () => 0 });
    const gameState = { score: 3, questionIndex: 3, answers: [] };

    const result = evaluateRound(round, gameState, 'carnivoro');

    expect(result.round.status).toBe('blocked');
    expect(result.round.diagnosticCode).toBe(DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET);
    expect(result.gameState).toBe(gameState);
  });

  test('TRIOFSND-318: a missing ficha also records a structured diagnostics.js error', () => {
    const round = startRound({ roundIndex: 0, level: 1, dinosaurPool: ['unknown-creature'], randomFn: () => 0 });
    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const diagnosticsService = { recordError: jest.fn() };

    evaluateRound(round, gameState, 'carnivoro', { diagnostics: diagnosticsService });

    expect(diagnosticsService.recordError).toHaveBeenCalledWith('clasifica', 'data', DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET);
  });

  test('a second evaluation of the same round never double-counts', () => {
    const round = startRound({ roundIndex: 0, level: 1, dinosaurPool: ['trex'], randomFn: () => 0 });
    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const first = evaluateRound(round, gameState, 'carnivoro');

    const second = evaluateRound(first.round, first.gameState, 'herbivoro');

    expect(second.gameState.score).toBe(1);
    expect(second.gameState.answers).toHaveLength(1);
  });
});

describe('startGame / completeRound: a full 10-round game', () => {
  test('rejects an invalid level', () => {
    expect(() => startGame({ level: 0 })).toThrow();
  });

  test('plays 10 rounds end to end, ending game over with a full score and no back-to-back repeats', () => {
    const seenDinosaurs = [];
    let game = startGame({ level: 1, randomFn: () => 0.5 });
    let { state } = game;
    let round = game.round;
    let result;

    for (let i = 0; i < ROUNDS_PER_GAME; i += 1) {
      seenDinosaurs.push(round.dinosaur);
      const diet = resolveVerifiedDiet(round.dinosaur).diet;

      result = completeRound({ round, gameState: state, level: 1, category: diet, randomFn: () => 0.5 });
      state = result.state;
      round = result.nextRound;
    }

    expect(result.gameOver).toBe(true);
    expect(state.score).toBe(ROUNDS_PER_GAME);
    expect(state.answers).toHaveLength(ROUNDS_PER_GAME);
    for (let i = 1; i < seenDinosaurs.length; i += 1) {
      expect(seenDinosaurs[i]).not.toBe(seenDinosaurs[i - 1]);
    }
  });
});
