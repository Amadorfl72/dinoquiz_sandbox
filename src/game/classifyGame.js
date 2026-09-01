'use strict';

/**
 * Round logic for the Clasifica game mode (TRIOFSND-279): creature selection,
 * carnivoro/herbivoro/omnivoro answer evaluation and a controlled guard for
 * unverifiable diets, orchestrated on top of `scoring.js` (points) and
 * `gameFlow.js` (the running game state shape/round advance) -- the same
 * primitives Quiz and Laberinto (`mazeGame.js`) already reuse instead of a
 * parallel scoring/progress implementation.
 *
 * A game is exactly ROUNDS_PER_GAME (10) rounds, mirrors gameFlow.js's
 * QUESTIONS_PER_GAME. Unlike Laberinto, every round shows all three diet
 * categories from level 1 onward -- level only flows through for the common
 * game-state contract (`gameFlow.isValidLevel`), it never filters the
 * creature pool or the categories offered. Each round:
 *   1. `startRound` picks a creature (never the same one two rounds in a
 *      row -- see `pickDinosaur`). It does not look at that creature's diet:
 *      Clasifica only needs the diet once the player has answered.
 *   2. `evaluateRound` takes the player's `category` guess and resolves the
 *      creature's diet from its single verified card
 *      (`src/data/creatureSheet.js`, `getCreatureSheet`) -- never copied or
 *      re-derived here -- then compares it against `category`.
 *   3. `round.evaluated` guards a second `evaluateRound` call on the same
 *      round from double-counting it, mirroring `mazeGame.js`.
 *   4. Controlled guard: when the picked creature has no verified card, or
 *      its diet isn't one of DIETS' three values, the round is blocked
 *      instead of scored -- only that round is affected, the other 9 of the
 *      game are untouched. A local diagnostic code identifies why (never the
 *      player's `category` guess, which stays out of the logged event on
 *      purpose -- it is not needed to diagnose a missing/invalid ficha and
 *      this is the one place in the module where it is in scope to log).
 */

const scoring = require('./scoring');
const gameFlow = require('./gameFlow');
const { DIETS, getCreatureSheet } = require('../data/creatureSheet');
const { VALID_DINOSAURS } = require('../data/questionBank');
const { LogService } = require('../services/logging');
const diagnostics = require('../services/diagnostics');

const ROUNDS_PER_GAME = 10;
const MODE_ID = 'clasifica';

const CATEGORIES = DIETS;
const VALID_CATEGORIES = Object.freeze(Object.values(DIETS));

// Local, machine-readable diagnostic codes for the controlled guard -- never
// free text, never the player's answer (PRD: privacy of a minor's gameplay
// data, [[G7]] in spirit -- diagnostics stay local and minimal).
const DIAGNOSTIC_CODES = Object.freeze({
  MISSING_CREATURE_SHEET: 'classify_missing_creature_sheet',
  INVALID_CREATURE_DIET: 'classify_invalid_creature_diet',
});

let defaultLogService;

/** Lazily resolves a shared LogService, mirroring mazeGame.js's own default resolution. */
function resolveDefaultLogService() {
  if (!defaultLogService) {
    defaultLogService = new LogService();
  }
  return defaultLogService;
}

function isValidCategory(category) {
  return VALID_CATEGORIES.indexOf(category) !== -1;
}

/**
 * Picks a creature for a round: uniformly at random from `pool`, excluding
 * `previousDinosaurId` when the pool has another option -- so the 10 rounds
 * of a game never show the same creature twice in a row.
 */
function pickDinosaur(previousDinosaurId, options) {
  options = options || {};
  const pool = options.dinosaurPool || VALID_DINOSAURS;
  const random = options.randomFn || Math.random;

  const candidates = pool.length > 1 ? pool.filter((id) => id !== previousDinosaurId) : pool;
  const index = Math.floor(random() * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)];
}

/**
 * Starts round `roundIndex` (0-based, < ROUNDS_PER_GAME): picks a creature
 * (never a repeat of `options.previousDinosaurId`). Unlike Laberinto's
 * `startRound`, this never reads the creature's diet -- Clasifica's own
 * guard only needs it once the player answers, in `evaluateRound`.
 */
function startRound(options) {
  options = options || {};
  const { roundIndex, level } = options;

  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= ROUNDS_PER_GAME) {
    throw new Error(`roundIndex must be an integer between 0 and ${ROUNDS_PER_GAME - 1}`);
  }

  const dinosaur = pickDinosaur(options.previousDinosaurId, {
    dinosaurPool: options.dinosaurPool,
    randomFn: options.randomFn,
  });

  return {
    roundIndex,
    level,
    dinosaur,
    status: 'playing',
    evaluated: false,
  };
}

/**
 * The creature's diet, resolved exclusively from its single verified card
 * (`options.getCreatureSheet`, defaulting to `creatureSheet.getCreatureSheet`)
 * -- never copied into a local table. Returns `{ diet }` when the card exists
 * and its diet is one of DIETS' three values, or `{ error: DIAGNOSTIC_CODES.* }`
 * otherwise -- a controlled result, never a throw, so a missing/invalid ficha
 * blocks only the round asking for it.
 */
function resolveVerifiedDiet(dinosaurId, options) {
  options = options || {};
  const lookup = options.getCreatureSheet || getCreatureSheet;
  const sheet = lookup(dinosaurId);

  if (!sheet) {
    return { error: DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET };
  }

  if (!isValidCategory(sheet.diet)) {
    return { error: DIAGNOSTIC_CODES.INVALID_CREATURE_DIET };
  }

  return { diet: sheet.diet };
}

/**
 * Evaluates the player's `category` guess for `round` exactly once
 * (`round.evaluated` guards a second call from double-counting the same
 * round, returning the same round/gameState untouched).
 *
 * Resolves the creature's diet via `resolveVerifiedDiet` and, when it can't
 * be verified (missing ficha or a diet outside carnivoro/herbivoro/omnivoro),
 * blocks only this round: it is marked `evaluated`/`status: 'blocked'` with
 * a local `diagnosticCode`, `gameState` is returned untouched (no score, no
 * answers entry -- so the blocked round is never counted, correct or
 * incorrect), and the controlled-guard event is logged with that code only
 * -- never `category`, even though it is a parameter in scope here.
 *
 * Otherwise scores the round via `scoring.applyAnswer` (reused from the same
 * module Quiz/Laberinto apply their answers with) and appends the round's
 * outcome to `gameState.answers`, shaped like gameFlow.js's own entries so
 * `gameFlow.calculateMaxStreak` folds over Clasifica rounds unchanged.
 */
function evaluateRound(round, gameState, category, options) {
  options = options || {};

  if (round && round.evaluated) {
    return { round, gameState };
  }

  if (!round || round.status !== 'playing') {
    throw new Error('evaluateRound requires a round whose status is "playing"');
  }

  if (!isValidCategory(category)) {
    throw new Error(`category must be one of ${VALID_CATEGORIES.join(', ')}`);
  }

  const verified = resolveVerifiedDiet(round.dinosaur, { getCreatureSheet: options.getCreatureSheet });

  if (verified.error) {
    const logService = options.logService || resolveDefaultLogService();
    logService.logEvent('classify_round_blocked', {
      code: verified.error,
      mode: MODE_ID,
      level: round.level,
      roundIndex: round.roundIndex,
    });
    // PRD failure point "ficha ausente" (TRIOFSND-318): the stable
    // diagnostic code alone, never round.dinosaur/category.
    const diagnosticsService = options.diagnostics || diagnostics;
    diagnosticsService.recordError(MODE_ID, 'data', verified.error);

    return {
      round: Object.assign({}, round, { status: 'blocked', evaluated: true, diagnosticCode: verified.error }),
      gameState,
    };
  }

  const isCorrect = category === verified.diet;
  const scored = scoring.applyAnswer(gameState.score, isCorrect);
  const answer = {
    roundIndex: round.roundIndex,
    dinosaur: round.dinosaur,
    diet: verified.diet,
    category,
    isCorrect,
  };

  return {
    round: Object.assign({}, round, { status: 'completed', evaluated: true, diet: verified.diet, category, isCorrect }),
    gameState: {
      score: scored.score,
      questionIndex: gameState.questionIndex + 1,
      answers: gameState.answers.concat([answer]),
    },
  };
}

/**
 * Starts a fresh Clasifica game: gameFlow.js's own initial state shape
 * (`{ score, questionIndex, answers }`, reused verbatim) plus the first of
 * ROUNDS_PER_GAME rounds. `options.level` must be a valid gameFlow.js level
 * (1-10), used only for the shared game-state contract -- it never filters
 * which creatures or categories a round can offer.
 */
function startGame(options) {
  options = options || {};
  const { level } = options;

  if (!gameFlow.isValidLevel(level)) {
    throw new Error(`level must be an integer between ${gameFlow.MIN_LEVEL} and ${gameFlow.MAX_LEVEL}`);
  }

  return {
    level,
    state: gameFlow.createInitialGameState(),
    round: startRound({
      roundIndex: 0,
      level,
      previousDinosaurId: null,
      randomFn: options.randomFn,
      dinosaurPool: options.dinosaurPool,
    }),
  };
}

/**
 * Composes `evaluateRound` with `startRound` for the next round (mirrors
 * `mazeGame.js`'s own `completeRound`): evaluates the just-answered round
 * and, unless it was the game's last round (ROUNDS_PER_GAME), also starts
 * round `round.roundIndex + 1`, attached as `nextRound`, so a caller
 * advances a full round -- blocked or scored -- in one call.
 */
function completeRound(params) {
  params = params || {};
  const { round, gameState, level, category } = params;
  const evaluated = evaluateRound(round, gameState, category, {
    getCreatureSheet: params.getCreatureSheet,
    logService: params.logService,
  });
  const nextRoundIndex = evaluated.round.roundIndex + 1;

  if (nextRoundIndex >= ROUNDS_PER_GAME) {
    return { gameOver: true, round: evaluated.round, state: evaluated.gameState };
  }

  return {
    gameOver: false,
    round: evaluated.round,
    state: evaluated.gameState,
    nextRound: startRound({
      roundIndex: nextRoundIndex,
      level,
      previousDinosaurId: evaluated.round.dinosaur,
      randomFn: params.randomFn,
      dinosaurPool: params.dinosaurPool,
    }),
  };
}

module.exports = {
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
};
