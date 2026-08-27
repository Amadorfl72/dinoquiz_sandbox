'use strict';

const {
  ROUNDS_PER_GAME,
  MODE_ID,
  CATEGORIES,
  DIAGNOSTIC_CODES,
  pickDinosaur,
  startRound,
  resolveVerifiedDiet,
  evaluateRound,
  startGame,
  completeRound,
} = require('./classifyGame');
const { DINOSAURS, VALID_DINOSAURS } = require('../data/questionBank');
const { DIETS } = require('../data/creatureSheet');

function buildMemoryLogService() {
  const events = [];
  return {
    events,
    logEvent(eventType, metadata) {
      events.push({ eventType, metadata });
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

describe('pickDinosaur', () => {
  test('never repeats the previous round creature when the pool has another option', () => {
    const pool = [DINOSAURS.TREX, DINOSAURS.TRICERATOPS];
    for (let i = 0; i < 20; i += 1) {
      const picked = pickDinosaur(DINOSAURS.TREX, { dinosaurPool: pool, randomFn: () => i / 20 });
      expect(picked).toBe(DINOSAURS.TRICERATOPS);
    }
  });

  test('falls back to the only pool member when there is no alternative', () => {
    expect(pickDinosaur(DINOSAURS.TREX, { dinosaurPool: [DINOSAURS.TREX], randomFn: () => 0 })).toBe(DINOSAURS.TREX);
  });

  test('defaults to the shipped dinosaur roster', () => {
    const picked = pickDinosaur(null, { randomFn: () => 0 });
    expect(VALID_DINOSAURS).toContain(picked);
  });
});

describe('startRound', () => {
  test('rejects a roundIndex outside 0..ROUNDS_PER_GAME-1', () => {
    expect(() => startRound({ roundIndex: -1, level: 1 })).toThrow();
    expect(() => startRound({ roundIndex: ROUNDS_PER_GAME, level: 1 })).toThrow();
  });

  test('returns a playable round with a creature but no diet resolved yet', () => {
    const round = startRound({ roundIndex: 0, level: 1, randomFn: () => 0 });

    expect(round.roundIndex).toBe(0);
    expect(round.status).toBe('playing');
    expect(round.evaluated).toBe(false);
    expect(round.diet).toBeUndefined();
    expect(VALID_DINOSAURS).toContain(round.dinosaur);
  });

  test('avoids repeating the previous round creature', () => {
    const round = startRound({
      roundIndex: 1,
      level: 1,
      previousDinosaurId: DINOSAURS.TREX,
      dinosaurPool: [DINOSAURS.TREX, DINOSAURS.TRICERATOPS],
      randomFn: () => 0,
    });

    expect(round.dinosaur).toBe(DINOSAURS.TRICERATOPS);
  });
});

describe('resolveVerifiedDiet', () => {
  test('resolves the diet exclusively from the creature single verified card', () => {
    expect(resolveVerifiedDiet(DINOSAURS.TREX)).toEqual({ diet: DIETS.CARNIVORO });
    expect(resolveVerifiedDiet(DINOSAURS.TRICERATOPS)).toEqual({ diet: DIETS.HERBIVORO });
  });

  test('flags a missing ficha with a local diagnostic code instead of guessing', () => {
    expect(resolveVerifiedDiet('unknown-creature')).toEqual({ error: DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET });
  });

  test('flags a ficha whose diet is outside carnivoro/herbivoro/omnivoro', () => {
    const getCreatureSheet = () => ({ id: 'broken', diet: 'insectivoro' });
    expect(resolveVerifiedDiet('broken', { getCreatureSheet })).toEqual({ error: DIAGNOSTIC_CODES.INVALID_CREATURE_DIET });
  });
});

describe('evaluateRound', () => {
  test('throws when the round is not playing', () => {
    const round = buildRound({ status: 'blocked' });
    expect(() => evaluateRound(round, { score: 0, questionIndex: 0, answers: [] }, DIETS.CARNIVORO)).toThrow();
  });

  test('rejects a category outside carnivoro/herbivoro/omnivoro', () => {
    const round = buildRound();
    expect(() => evaluateRound(round, { score: 0, questionIndex: 0, answers: [] }, 'insectivoro')).toThrow();
  });

  test('scores a correct guess and appends its answer entry', () => {
    const round = buildRound({ dinosaur: DINOSAURS.TREX });
    const gameState = { score: 0, questionIndex: 0, answers: [] };

    const result = evaluateRound(round, gameState, DIETS.CARNIVORO);

    expect(result.round.status).toBe('completed');
    expect(result.round.evaluated).toBe(true);
    expect(result.round.isCorrect).toBe(true);
    expect(result.gameState.score).toBe(1);
    expect(result.gameState.questionIndex).toBe(1);
    expect(result.gameState.answers).toEqual([
      { roundIndex: 0, dinosaur: DINOSAURS.TREX, diet: DIETS.CARNIVORO, category: DIETS.CARNIVORO, isCorrect: true },
    ]);
  });

  test('scores an incorrect guess without awarding a point', () => {
    const round = buildRound({ dinosaur: DINOSAURS.TREX });
    const gameState = { score: 0, questionIndex: 0, answers: [] };

    const result = evaluateRound(round, gameState, DIETS.HERBIVORO);

    expect(result.round.isCorrect).toBe(false);
    expect(result.gameState.score).toBe(0);
    expect(result.gameState.answers[0].isCorrect).toBe(false);
  });

  test('a second evaluation of the same round is a no-op (never double-counts)', () => {
    const round = buildRound({ dinosaur: DINOSAURS.TREX });
    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const first = evaluateRound(round, gameState, DIETS.CARNIVORO);

    const second = evaluateRound(first.round, first.gameState, DIETS.HERBIVORO);

    expect(second.gameState.score).toBe(1);
    expect(second.gameState.answers).toHaveLength(1);
  });

  test('blocks only the affected round when the ficha is missing, without scoring or advancing questionIndex', () => {
    const round = buildRound({ dinosaur: 'unknown-creature' });
    const gameState = { score: 3, questionIndex: 3, answers: [] };
    const logService = buildMemoryLogService();

    const result = evaluateRound(round, gameState, DIETS.CARNIVORO, { logService });

    expect(result.round.status).toBe('blocked');
    expect(result.round.evaluated).toBe(true);
    expect(result.round.diagnosticCode).toBe(DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET);
    expect(result.gameState).toBe(gameState);
    expect(result.gameState.answers).toHaveLength(0);
  });

  test('blocks only the affected round when the diet is not one of the three categories', () => {
    const round = buildRound({ dinosaur: 'broken' });
    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const getCreatureSheet = () => ({ id: 'broken', diet: 'insectivoro' });

    const result = evaluateRound(round, gameState, DIETS.CARNIVORO, { getCreatureSheet });

    expect(result.round.status).toBe('blocked');
    expect(result.round.diagnosticCode).toBe(DIAGNOSTIC_CODES.INVALID_CREATURE_DIET);
  });

  test('the controlled guard logs the diagnostic code but never the category the player chose', () => {
    const round = buildRound({ dinosaur: 'unknown-creature' });
    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const logService = buildMemoryLogService();

    evaluateRound(round, gameState, DIETS.OMNIVORO, { logService });

    expect(logService.events).toEqual([
      {
        eventType: 'classify_round_blocked',
        metadata: { code: DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET, mode: MODE_ID, level: 1, roundIndex: 0 },
      },
    ]);
    logService.events.forEach((event) => {
      expect(JSON.stringify(event)).not.toMatch(/omnivoro/);
    });
  });

  test('a blocked round guards a second evaluation the same way completed rounds do', () => {
    const round = buildRound({ dinosaur: 'unknown-creature' });
    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const first = evaluateRound(round, gameState, DIETS.CARNIVORO);

    const second = evaluateRound(first.round, first.gameState, DIETS.HERBIVORO);

    expect(second.round).toBe(first.round);
    expect(second.gameState).toBe(first.gameState);
  });
});

describe('startGame', () => {
  test('rejects an invalid level', () => {
    expect(() => startGame({ level: 0 })).toThrow();
    expect(() => startGame({ level: 11 })).toThrow();
  });

  test('returns a fresh state and the first of ROUNDS_PER_GAME rounds', () => {
    const game = startGame({ level: 1, randomFn: () => 0 });

    expect(game.state).toEqual({ score: 0, questionIndex: 0, answers: [] });
    expect(game.round.roundIndex).toBe(0);
    expect(game.round.status).toBe('playing');
  });
});

describe('completeRound', () => {
  test('ends the game once ROUNDS_PER_GAME rounds are answered', () => {
    const round = buildRound({ roundIndex: ROUNDS_PER_GAME - 1, dinosaur: DINOSAURS.TREX });
    const gameState = { score: ROUNDS_PER_GAME - 1, questionIndex: ROUNDS_PER_GAME - 1, answers: [] };

    const result = completeRound({ round, gameState, level: 1, category: DIETS.CARNIVORO });

    expect(result.gameOver).toBe(true);
    expect(result.state.score).toBe(ROUNDS_PER_GAME);
    expect(result.nextRound).toBeUndefined();
  });

  test('otherwise scores the round and starts the next one, avoiding an immediate creature repeat', () => {
    const round = buildRound({ dinosaur: DINOSAURS.TREX });
    const gameState = { score: 0, questionIndex: 0, answers: [] };

    const result = completeRound({
      round,
      gameState,
      level: 1,
      category: DIETS.CARNIVORO,
      dinosaurPool: [DINOSAURS.TREX, DINOSAURS.TRICERATOPS],
      randomFn: () => 0,
    });

    expect(result.gameOver).toBe(false);
    expect(result.nextRound.roundIndex).toBe(1);
    expect(result.nextRound.dinosaur).not.toBe(round.dinosaur);
  });
});

describe('a full 10-round game, played end to end', () => {
  test('plays 10 rounds, ending game over with no back-to-back repeats and every category represented', () => {
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

test('CATEGORIES is the creature sheet DIETS, never a copy', () => {
  expect(CATEGORIES).toBe(DIETS);
});
