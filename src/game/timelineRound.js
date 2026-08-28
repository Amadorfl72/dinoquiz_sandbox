'use strict';

/**
 * Round logic for the Línea del tiempo game mode (TRIOFSND-291): eligible
 * creature selection, period-answer evaluation and the period/classification
 * explanation, orchestrated on top of `scoring.js` (points) and `gameFlow.js`
 * (the running game state shape/round advance, shuffle) -- the same
 * primitives Quiz/Laberinto/Clasifica already reuse instead of a parallel
 * scoring/progress implementation.
 *
 * Eligibility gate (PRD "Ficha única y verificable"): a creature only enters
 * the pool a game is built from when its single verified card
 * (`src/data/creatureSheet.js`) declares BOTH a valid `mainPeriod`
 * (Triásico/Jurásico/Cretácico) AND a valid `classification`
 * (dinosaurio/reptil_volador/otro) -- `selectEligibleCreatures`. Anything
 * else (no sheet at all, or a sheet missing/outside either field) is
 * discarded before any round is built: it never becomes a round, and the
 * discard's reason is tallied locally via the existing round-diagnostics
 * counter (`LogService#logRoundGenerationFailure(MODE_ID, code)` --
 * public/scripts/roundDiagnosticsService.js's family, the same one
 * sizeOrderRoundGenerator.js/shadowGuessRound.js's own local failure codes
 * already feed) -- a stable code only, never the creature's id or any round
 * content.
 *
 * A game is exactly ROUNDS_PER_GAME (10) rounds, one distinct eligible
 * creature per round (`startGame` shuffles the eligible pool once and takes
 * its first ROUNDS_PER_GAME entries) -- so, together with `evaluateRound`'s
 * `round.evaluated` guard against a second call on the same round, every
 * round's answer is counted at most once and no creature is asked about
 * twice in the same game. If the eligible pool has fewer than
 * ROUNDS_PER_GAME creatures, no game is built at all: `startGame` returns
 * `{ error: ERRORS.INSUFFICIENT_ELIGIBLE_CREATURES, details }` instead --
 * the mode's own specific blocking state -- mirroring
 * parejasGame.js/shadowGuessRound.js's "return a local error code, never a
 * partial game" contract.
 *
 * Each round asks the player to pick one of the three PERIODS (never a
 * fourth "precise interval" option -- there are only ever three valid
 * answers, matching classifyGame.js's fixed three-category CATEGORIES).
 * `evaluateRound` compares the guess against the creature's verified
 * `mainPeriod` and attaches the explanation content once evaluated:
 * `explanation.mainPeriod` (also the correct answer), `explanation.
 * temporalRangeMillionsOfYears` (the creature's verified precise interval,
 * `null` when none is documented -- never fabricated, never a selectable
 * option), and `explanation.classification` (e.g. Pteranodon resolves to
 * `CLASSIFICATIONS.REPTIL_VOLADOR`, not `DINOSAURIO`, so the mode never
 * states that as fact -- PRD G4). None of this is exposed on the round
 * before it is evaluated, so the round object handed to a player never
 * leaks the answer up front (mirrors classifyGame.js's own `startRound`).
 *
 * Level-unlock chain (TRIOFSND-294, PRD "Progresión independiente por
 * modo"): `completeLevel` registers this mode into gameFlow.js's common
 * game contract exactly the way public/scripts/shadowGuessGame.js's own
 * `completeLevel` does -- composing `gameFlow.resolveLevelOutcome` (scoped
 * to this mode's own `MODE_ID` entry in unlockThresholds.js, never another
 * mode's) with `startGame` for whichever level unlocks next. This is the
 * single place that decides a level's *fin* (game over vs. level-up) from
 * that level's own 10 rondas/aciertos, purely a function of `params.level`/
 * `params.answers` -- it carries no state of its own between calls.
 */

const gameFlow = require('./gameFlow');
const scoring = require('./scoring');
const { PERIODS, CLASSIFICATIONS, getCreatureSheet } = require('../data/creatureSheet');
const { VALID_DINOSAURS } = require('../data/questionBank');
const { LogService } = require('../services/logging');
const { MODE_IDS } = require('./modesCatalog');

const ROUNDS_PER_GAME = 10;
const MODE_ID = MODE_IDS.LINEA_DEL_TIEMPO;

const VALID_PERIODS = Object.freeze(Object.values(PERIODS));
const VALID_CLASSIFICATIONS = Object.freeze(Object.values(CLASSIFICATIONS));

// Local, machine-readable diagnostic codes for creatures discarded from the
// eligible pool -- never free text, never the round content (PRD: privacy
// of a minor's gameplay data, [[G7]] in spirit -- diagnostics stay local and
// minimal).
const DIAGNOSTIC_CODES = Object.freeze({
  MISSING_CREATURE_SHEET: 'timeline_missing_creature_sheet',
  INVALID_MAIN_PERIOD: 'timeline_invalid_main_period',
  INVALID_CLASSIFICATION: 'timeline_invalid_classification',
});

// The mode-level blocking state exposed by `startGame` when the eligible
// pool can't fill a whole game.
const ERRORS = Object.freeze({
  INSUFFICIENT_ELIGIBLE_CREATURES: 'timeline_insufficient_eligible_creatures',
});

let defaultLogService;

/** Lazily resolves a shared LogService, mirroring classifyGame.js's own default resolution. */
function resolveDefaultLogService() {
  if (!defaultLogService) {
    defaultLogService = new LogService();
  }
  return defaultLogService;
}

function isValidPeriod(period) {
  return VALID_PERIODS.indexOf(period) !== -1;
}

function isValidClassification(classification) {
  return VALID_CLASSIFICATIONS.indexOf(classification) !== -1;
}

/**
 * The reason `dinosaurId` cannot enter the eligible pool: `null` when its
 * verified card has both a valid `mainPeriod` and a valid `classification`,
 * otherwise the DIAGNOSTIC_CODES.* explaining why -- missing sheet checked
 * before either field, since neither can be evaluated without one.
 */
function ineligibilityReason(dinosaurId, options) {
  options = options || {};
  const lookup = options.getCreatureSheet || getCreatureSheet;
  const sheet = lookup(dinosaurId);

  if (!sheet) {
    return DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET;
  }
  if (!isValidPeriod(sheet.mainPeriod)) {
    return DIAGNOSTIC_CODES.INVALID_MAIN_PERIOD;
  }
  if (!isValidClassification(sheet.classification)) {
    return DIAGNOSTIC_CODES.INVALID_CLASSIFICATION;
  }
  return null;
}

/** Whether `dinosaurId`'s verified card qualifies for a Línea del tiempo round (`ineligibilityReason` is `null`). */
function isEligibleCreature(dinosaurId, options) {
  return ineligibilityReason(dinosaurId, options) === null;
}

/**
 * Every id in `options.dinosaurPool` (defaults to `VALID_DINOSAURS`) whose
 * verified card is eligible (`isEligibleCreature`), in pool order. Every
 * discarded id's reason is tallied once via
 * `options.logService.logRoundGenerationFailure(MODE_ID, code)` (defaults to
 * a shared `LogService`) -- the discard itself, never generating a round
 * from that creature, is the only effect a discard has here.
 */
function selectEligibleCreatures(options) {
  options = options || {};
  const pool = options.dinosaurPool || VALID_DINOSAURS;
  const logService = options.logService || resolveDefaultLogService();

  const eligible = [];
  pool.forEach((dinosaurId) => {
    const reason = ineligibilityReason(dinosaurId, { getCreatureSheet: options.getCreatureSheet });
    if (reason) {
      logService.logRoundGenerationFailure(MODE_ID, reason);
      return;
    }
    eligible.push(dinosaurId);
  });

  return eligible;
}

/**
 * Starts round `roundIndex` (0-based, < ROUNDS_PER_GAME) for `dinosaur` (an
 * already-eligible creature id, picked by the caller -- see `startGame`).
 * Never reads the creature's period/classification: those are only resolved
 * once the player answers, in `evaluateRound`, so the round handed to the
 * player never leaks the answer.
 */
function startRound(options) {
  options = options || {};
  const { roundIndex, level, dinosaur } = options;

  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= ROUNDS_PER_GAME) {
    throw new Error(`roundIndex must be an integer between 0 and ${ROUNDS_PER_GAME - 1}`);
  }
  if (typeof dinosaur !== 'string' || dinosaur.length === 0) {
    throw new Error('startRound requires options.dinosaur');
  }

  return {
    roundIndex,
    level,
    dinosaur,
    status: 'playing',
    evaluated: false,
  };
}

/**
 * The creature's period/classification/precise interval, resolved
 * exclusively from its single verified card (`options.getCreatureSheet`,
 * defaulting to `creatureSheet.getCreatureSheet`) -- never copied into a
 * local table. Returns `{ mainPeriod, classification, temporalRangeMillionsOfYears }`
 * (the last one `null` when no precise range is documented) when the card is
 * eligible, or `{ error: DIAGNOSTIC_CODES.* }` otherwise -- a controlled
 * result, never a throw, so a ficha that somehow became invalid between
 * `startGame` and this call blocks only the one round asking about it.
 */
function resolveVerifiedTimelineFicha(dinosaurId, options) {
  options = options || {};
  const reason = ineligibilityReason(dinosaurId, options);
  if (reason) {
    return { error: reason };
  }

  const lookup = options.getCreatureSheet || getCreatureSheet;
  const sheet = lookup(dinosaurId);
  return {
    mainPeriod: sheet.mainPeriod,
    classification: sheet.classification,
    temporalRangeMillionsOfYears: sheet.temporalRangeMillionsOfYears || null,
  };
}

/**
 * Evaluates the player's `periodGuess` for `round` exactly once
 * (`round.evaluated` guards a second call from double-counting the same
 * round, returning the same round/gameState untouched) -- so, combined with
 * `startGame` only ever building ROUNDS_PER_GAME rounds from distinct
 * eligible creatures, every round's answer is counted at most once.
 *
 * `periodGuess` must be one of PERIODS (a caller/programming error
 * otherwise, mirrors classifyGame.js's `category` validation). Resolves the
 * creature's verified ficha via `resolveVerifiedTimelineFicha` and, on the
 * rare case it can no longer be verified, blocks only this round (`status:
 * 'blocked'`, a local `diagnosticCode`, `gameState` untouched -- never
 * counted correct or incorrect) and tallies the same discard code via
 * `logRoundGenerationFailure`.
 *
 * Otherwise scores the round via `scoring.applyAnswer` against the creature's
 * `mainPeriod` and appends the round's outcome to `gameState.answers`
 * (shaped like gameFlow.js's own entries), and attaches `explanation` --
 * `{ mainPeriod, temporalRangeMillionsOfYears, classification }` -- the
 * precise-interval-when-it-exists and classification (e.g. Pteranodon's
 * `reptil_volador`) content a caller shows as feedback, never a fourth
 * answer option.
 */
function evaluateRound(round, gameState, periodGuess, options) {
  options = options || {};

  if (round && round.evaluated) {
    return { round, gameState };
  }

  if (!round || round.status !== 'playing') {
    throw new Error('evaluateRound requires a round whose status is "playing"');
  }

  if (!isValidPeriod(periodGuess)) {
    throw new Error(`periodGuess must be one of ${VALID_PERIODS.join(', ')}`);
  }

  const verified = resolveVerifiedTimelineFicha(round.dinosaur, { getCreatureSheet: options.getCreatureSheet });

  if (verified.error) {
    const logService = options.logService || resolveDefaultLogService();
    logService.logRoundGenerationFailure(MODE_ID, verified.error);

    return {
      round: Object.assign({}, round, { status: 'blocked', evaluated: true, diagnosticCode: verified.error }),
      gameState,
    };
  }

  const isCorrect = periodGuess === verified.mainPeriod;
  const scored = scoring.applyAnswer(gameState.score, isCorrect);
  const answer = {
    roundIndex: round.roundIndex,
    dinosaur: round.dinosaur,
    mainPeriod: verified.mainPeriod,
    periodGuess,
    isCorrect,
  };

  const explanation = {
    mainPeriod: verified.mainPeriod,
    temporalRangeMillionsOfYears: verified.temporalRangeMillionsOfYears,
    classification: verified.classification,
  };

  return {
    round: Object.assign({}, round, {
      status: 'completed',
      evaluated: true,
      periodGuess,
      isCorrect,
      explanation,
    }),
    gameState: {
      score: scored.score,
      questionIndex: gameState.questionIndex + 1,
      answers: gameState.answers.concat([answer]),
    },
  };
}

/**
 * Starts a fresh Línea del tiempo game: `selectEligibleCreatures` first,
 * blocking with `{ error: ERRORS.INSUFFICIENT_ELIGIBLE_CREATURES, details }`
 * (this mode's specific blocking state) when there are fewer than
 * ROUNDS_PER_GAME eligible creatures, instead of starting a game that could
 * never reach 10 rounds. Otherwise shuffles the eligible pool once
 * (`options.randomFn`, injectable for tests) and keeps its first
 * ROUNDS_PER_GAME entries as `order` -- one distinct creature per round, so
 * no creature is asked about twice in the same game -- then mirrors
 * classifyGame.js's `startGame`: gameFlow.js's own initial state shape plus
 * the first round.
 */
function startGame(options) {
  options = options || {};
  const { level } = options;

  if (!gameFlow.isValidLevel(level)) {
    throw new Error(`level must be an integer between ${gameFlow.MIN_LEVEL} and ${gameFlow.MAX_LEVEL}`);
  }

  const eligible = selectEligibleCreatures({
    dinosaurPool: options.dinosaurPool,
    getCreatureSheet: options.getCreatureSheet,
    logService: options.logService,
  });

  if (eligible.length < ROUNDS_PER_GAME) {
    return {
      error: ERRORS.INSUFFICIENT_ELIGIBLE_CREATURES,
      details: { need: ROUNDS_PER_GAME, have: eligible.length },
    };
  }

  const randomFn = options.randomFn || Math.random;
  const order = gameFlow.shuffle(eligible, randomFn).slice(0, ROUNDS_PER_GAME);

  return {
    level,
    order,
    state: gameFlow.createInitialGameState(),
    round: startRound({ roundIndex: 0, level, dinosaur: order[0] }),
  };
}

/**
 * Composes `evaluateRound` with `startRound` for the next round (mirrors
 * classifyGame.js's `completeRound`): evaluates the just-answered round and,
 * unless it was the game's last round (ROUNDS_PER_GAME), also starts round
 * `round.roundIndex + 1` for `order[round.roundIndex + 1]` (the same `order`
 * `startGame` returned), attached as `nextRound` -- so a caller advances a
 * full round in one call.
 */
function completeRound(params) {
  params = params || {};
  const { round, gameState, level, order, periodGuess } = params;
  const evaluated = evaluateRound(round, gameState, periodGuess, {
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
    nextRound: startRound({ roundIndex: nextRoundIndex, level, dinosaur: order[nextRoundIndex] }),
  };
}

/**
 * Composes `gameFlow.resolveLevelOutcome` (scoped to this mode's own
 * unlockThresholds.js entry, MODE_ID) with the `startGame` above: resolves
 * what happens once a level's ROUNDS_PER_GAME rounds are all answered and,
 * when a next level unlocks, also starts it (attached as `nextLevelGame`).
 * Mirrors gameFlow.js's own `completeLevel`/shadowGuessGame.js's exactly,
 * but generating this mode's own eligible-creature rounds instead of
 * pulling from the question bank. `params` (`dinosaurPool`,
 * `getCreatureSheet`, `randomFn`, `logService`) is forwarded to `startGame`
 * as-is, so the next level is generated the same way any fresh game is.
 */
function completeLevel(params) {
  params = params || {};
  const outcome = gameFlow.resolveLevelOutcome({
    level: params.level,
    answers: params.answers,
    modeId: MODE_ID,
  });

  if (outcome.gameOver) {
    return outcome;
  }

  outcome.nextLevelGame = startGame(Object.assign({}, params, { level: outcome.nextLevel }));
  return outcome;
}

module.exports = {
  ROUNDS_PER_GAME,
  MODE_ID,
  PERIODS: VALID_PERIODS,
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
  completeLevel,
};
