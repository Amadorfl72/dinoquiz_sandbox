'use strict';

const path = require('path');

const SHADOW_GUESS_GAME_PATH = path.resolve(__dirname, '../../public/scripts/shadowGuessGame.js');

const {
  ROUNDS_PER_GAME,
  MODE_ID,
  APPROVED_SHADOW_CREATURE_IDS,
  SHADOW_MODE_MIN_APPROVED,
  isShadowModeUnlocked,
  pickTarget,
  pickDistractors,
  generateShadowRound,
  generateShadowRounds,
  startLevel,
  completeLevel,
} = require(SHADOW_GUESS_GAME_PATH);
const { getApprovedShadowCreatures, isShadowModeUnlocked: realIsShadowModeUnlocked } = require('../../src/data/creatureSheet');
const { MODE_IDS } = require('../../src/game/modesCatalog');

/**
 * TRIOFSND-265: public/scripts/shadowGuessGame.js is the browser-runnable
 * twin of src/game/shadowGuessRound.js (see that file's own doc comment for
 * why it can't just re-export it -- the real module's dependency chain
 * requires `fs`, which doesn't exist in a real, unbundled browser). Its local
 * `APPROVED_SHADOW_CREATURES` mirrors src/data/creatureSheet.js by hand, so
 * this guards against the two silently drifting apart.
 */
describe('public/scripts/shadowGuessGame.js mirrors the authoritative creature data', () => {
  test('APPROVED_SHADOW_CREATURE_IDS matches src/data/creatureSheet.js approved roster', () => {
    expect(APPROVED_SHADOW_CREATURE_IDS.slice().sort()).toEqual(getApprovedShadowCreatures().slice().sort());
  });

  test('MODE_ID matches src/game/modesCatalog.js MODE_IDS.SOMBRA', () => {
    expect(MODE_ID).toBe(MODE_IDS.SOMBRA);
  });

  test('isShadowModeUnlocked agrees with the real creatureSheet.js check', () => {
    expect(isShadowModeUnlocked()).toBe(realIsShadowModeUnlocked());
  });
});

describe('pickTarget / pickDistractors', () => {
  test('pickTarget never repeats the previous round creature when the pool has another option', () => {
    const pool = ['trex', 'triceratops'];
    for (let i = 0; i < 20; i += 1) {
      const picked = pickTarget('trex', pool, () => i / 20);
      expect(picked).toBe('triceratops');
    }
  });

  test('pickDistractors never returns an indistinguishable pair', () => {
    const distractors = pickDistractors('braquiosaurio', APPROVED_SHADOW_CREATURE_IDS, 3, () => 0.1);
    expect(distractors).not.toContain('diplodocus');
    expect(distractors).toHaveLength(3);
  });
});

describe('generateShadowRound / generateShadowRounds', () => {
  test('rejects a roundIndex outside 0..ROUNDS_PER_GAME-1', () => {
    expect(() => generateShadowRound({ roundIndex: -1, level: 1, randomFn: () => 0 })).toThrow();
    expect(() => generateShadowRound({ roundIndex: ROUNDS_PER_GAME, level: 1, randomFn: () => 0 })).toThrow();
  });

  test('returns a shuffled 4-option round with the target included', () => {
    const round = generateShadowRound({ roundIndex: 0, level: 1, randomFn: () => 0.2 });

    expect(round.error).toBeUndefined();
    expect(round.status).toBe('playing');
    expect(round.options).toHaveLength(4);
    expect(round.options).toContain(round.correctId);
    expect(APPROVED_SHADOW_CREATURE_IDS).toContain(round.correctId);
  });

  test('level 1 never applies a transform (identity only)', () => {
    for (let i = 0; i < 10; i += 1) {
      const round = generateShadowRound({ roundIndex: 0, level: 1, randomFn: () => i / 10 });
      expect(round.transform).toBeNull();
    }
  });

  test('generateShadowRounds produces exactly ROUNDS_PER_GAME rounds with no back-to-back repeat', () => {
    const result = generateShadowRounds({ level: 1, randomFn: () => 0.5 });
    expect(result.error).toBeUndefined();
    expect(result.rounds).toHaveLength(ROUNDS_PER_GAME);
    for (let i = 1; i < result.rounds.length; i += 1) {
      expect(result.rounds[i].correctId).not.toBe(result.rounds[i - 1].correctId);
    }
  });
});

describe('startLevel / completeLevel: level chain', () => {
  test('rejects an invalid level', () => {
    expect(() => startLevel(0, {})).toThrow();
  });

  test('starts a level with ROUNDS_PER_GAME ready-to-play rounds', () => {
    const levelGame = startLevel(1, { randomFn: () => 0.3 });
    expect(levelGame.error).toBeUndefined();
    expect(levelGame.level).toBe(1);
    expect(levelGame.state).toEqual({ score: 0, questionIndex: 0, answers: [] });
    expect(levelGame.rounds).toHaveLength(ROUNDS_PER_GAME);
  });

  test('completeLevel unlocks the next level once enough answers are correct, and chains a fresh set of rounds', () => {
    const answers = Array.from({ length: 10 }, () => ({ isCorrect: true }));
    const outcome = completeLevel({ level: 1, answers, randomFn: () => 0.4 });

    expect(outcome.gameOver).toBe(false);
    expect(outcome.nextLevel).toBe(2);
    expect(outcome.nextLevelGame.error).toBeUndefined();
    expect(outcome.nextLevelGame.rounds).toHaveLength(ROUNDS_PER_GAME);
  });

  test('completeLevel ends the game with insufficient correct answers', () => {
    const answers = Array.from({ length: 10 }, () => ({ isCorrect: false }));
    const outcome = completeLevel({ level: 1, answers, randomFn: () => 0.4 });

    expect(outcome.gameOver).toBe(true);
    expect(outcome.reason).toBe('insufficient_score');
  });

  test('completeLevel always ends the game at the max level', () => {
    const answers = Array.from({ length: 10 }, () => ({ isCorrect: true }));
    const outcome = completeLevel({ level: 10, answers, randomFn: () => 0.4 });

    expect(outcome.gameOver).toBe(true);
    expect(outcome.reason).toBe('completed_all_levels');
  });
});

describe('SHADOW_MODE_MIN_APPROVED', () => {
  test('matches the real creatureSheet.js threshold', () => {
    // eslint-disable-next-line global-require
    const { SHADOW_MODE_MIN_APPROVED: realThreshold } = require('../../src/data/creatureSheet');
    expect(SHADOW_MODE_MIN_APPROVED).toBe(realThreshold);
  });
});
