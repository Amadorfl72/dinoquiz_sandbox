'use strict';

/**
 * Round logic for the Laberinto game mode (TRIOFSND-256): movement, diet and
 * per-round evaluation, orchestrated on top of `mazeGenerator.js` (maze
 * carving/solvability), `scoring.js` (points) and `gameFlow.js` (the running
 * game state shape/round advance), so a Laberinto game reuses the same
 * primitives as Quiz instead of a parallel scoring/progress implementation.
 *
 * A game is exactly ROUNDS_PER_GAME (10) rounds, mirrors gameFlow.js's
 * QUESTIONS_PER_GAME. Each round:
 *   1. `startRound` picks a creature (never the same one two rounds in a
 *      row -- see `pickDinosaur`) and generates its maze via
 *      `mazeGenerator.generateMaze`.
 *   2. `applyMove` validates every move against the current cell's walls
 *      (via `mazeGenerator`'s own N/S/E/W wall model): a move into a wall or
 *      out of bounds is rejected and the creature's position is left
 *      untouched (`blocked: true`); only an open direction advances it.
 *   3. Once the move lands on `maze.goal`, the round's `status` becomes
 *      `'reached_goal'` -- `applyMove` never scores it itself.
 *   4. `evaluateRound` scores that round exactly once (`round.evaluated`
 *      guards a second call from double-scoring the same round) via
 *      `scoring.applyAnswer`, and appends the round's outcome to
 *      `gameState.answers` (the same shape gameFlow.js's
 *      `calculateMaxStreak` already knows how to fold over).
 *
 * Diet/goal food (PRD: "carne/hojas/premio mixto para omnívoros") comes
 * exclusively from the creature's single verified card in
 * `src/data/creatureSheet.js` (`getCreatureSheet`/`getCreatureDiet`) via
 * `DIET_TO_FOOD` -- no round ever re-derives or hardcodes a diet itself.
 */

const { generateMaze } = require('./mazeGenerator');
const scoring = require('./scoring');
const gameFlow = require('./gameFlow');
const { DIETS, getCreatureSheet } = require('../data/creatureSheet');
const { VALID_DINOSAURS } = require('../data/questionBank');
const { LogService } = require('../services/logging');

const ROUNDS_PER_GAME = 10;
const MODE_ID = 'laberinto';

const FOODS = Object.freeze({
  MEAT: 'carne',
  LEAVES: 'hojas',
  MIXED: 'mixto',
});

// PRD: "carne/hojas/premio mixto para omnívoros" -- the only mapping from a
// verified diet to the food shown at the maze's goal.
const DIET_TO_FOOD = Object.freeze({
  [DIETS.CARNIVORO]: FOODS.MEAT,
  [DIETS.HERBIVORO]: FOODS.LEAVES,
  [DIETS.OMNIVORO]: FOODS.MIXED,
});

// Direction -> the wall (mazeGenerator's N/S/E/W model) and the row/col step
// that direction takes once that wall is open.
const MOVE_DELTAS = Object.freeze({
  up: Object.freeze({ wall: 'N', deltaRow: -1, deltaCol: 0 }),
  down: Object.freeze({ wall: 'S', deltaRow: 1, deltaCol: 0 }),
  left: Object.freeze({ wall: 'W', deltaRow: 0, deltaCol: -1 }),
  right: Object.freeze({ wall: 'E', deltaRow: 0, deltaCol: 1 }),
});

const MOVE_DIRECTIONS = Object.freeze(Object.keys(MOVE_DELTAS));

let defaultLogService;

/** Lazily resolves a shared LogService, mirroring mazeGenerator.js's own default resolution. */
function resolveDefaultLogService() {
  if (!defaultLogService) {
    defaultLogService = new LogService();
  }
  return defaultLogService;
}

const noopLogService = Object.freeze({ logEvent: function noop() {} });

function isValidDirection(direction) {
  return Object.prototype.hasOwnProperty.call(MOVE_DELTAS, direction);
}

/**
 * The creature's diet and goal food (PRD: carne/hojas/premio mixto),
 * resolved exclusively from its single verified card
 * (`options.getCreatureSheet`, defaulting to `creatureSheet.getCreatureSheet`).
 * Throws for a creature with no card rather than guessing a diet.
 */
function getGoalFood(dinosaurId, options) {
  options = options || {};
  const lookup = options.getCreatureSheet || getCreatureSheet;
  const sheet = lookup(dinosaurId);

  if (!sheet || !DIET_TO_FOOD[sheet.diet]) {
    throw new Error(`No verified creature sheet/diet for "${dinosaurId}"`);
  }

  return { diet: sheet.diet, food: DIET_TO_FOOD[sheet.diet] };
}

/**
 * Picks a creature for a round: uniformly at random from `pool`, excluding
 * `previousDinosaurId` when the pool has another option -- so the 10 rounds
 * of a game never show the same creature twice in a row (modesCatalog.js's
 * Laberinto requirement: enough distinct creatures to avoid that repeat).
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
 * Generates a round's maze, suppressing `generateMaze`'s own generic
 * failure log (it only knows level/seed) so this module logs the single,
 * richer `maze_round_generation_failed` event instead -- code (the
 * generation error), mode ('laberinto') and, via LogService's own
 * `createLogEntry`, the timestamp every logged event already carries.
 */
function generateRoundMaze(level, seed, roundIndex, logService) {
  const maze = generateMaze({ seed, level, logService: noopLogService });

  if (maze.error) {
    logService.logEvent('maze_round_generation_failed', {
      code: maze.error,
      mode: MODE_ID,
      level,
      seed: String(seed),
      roundIndex,
    });
  }

  return maze;
}

/**
 * Starts round `roundIndex` (0-based, < ROUNDS_PER_GAME): picks a creature
 * (never a repeat of `options.previousDinosaurId`), generates its maze for
 * `level`, and resolves its goal food from that creature's single card.
 * Returns `{ error, level, seed, roundIndex }` (never a round) when the
 * maze couldn't be generated/verified as solvable -- the failure is already
 * logged by `generateRoundMaze` by the time this returns.
 */
function startRound(options) {
  options = options || {};
  const { roundIndex, level } = options;

  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= ROUNDS_PER_GAME) {
    throw new Error(`roundIndex must be an integer between 0 and ${ROUNDS_PER_GAME - 1}`);
  }

  const logService = options.logService || resolveDefaultLogService();
  const seed = `${options.seed}:${roundIndex}`;
  const maze = generateRoundMaze(level, seed, roundIndex, logService);

  if (maze.error) {
    return { error: maze.error, level, seed, roundIndex };
  }

  const dinosaur = pickDinosaur(options.previousDinosaurId, {
    dinosaurPool: options.dinosaurPool,
    randomFn: options.randomFn,
  });
  const { diet, food } = getGoalFood(dinosaur, { getCreatureSheet: options.getCreatureSheet });

  return {
    roundIndex,
    level,
    seed,
    dinosaur,
    diet,
    food,
    maze,
    position: { row: maze.start.row, col: maze.start.col },
    moves: 0,
    status: 'playing',
    blocked: false,
    evaluated: false,
  };
}

/** Whether `direction` is blocked by a wall from the round's current position. */
function isMoveBlocked(round, direction) {
  const cell = round.maze.grid[round.position.row][round.position.col];
  return Boolean(cell.walls[MOVE_DELTAS[direction].wall]);
}

/**
 * Applies one movement attempt to `round`. A move into a wall or the grid's
 * edge never displaces the creature -- it only flips `blocked: true` on an
 * otherwise-unchanged round, per mazeGenerator's own wall model (a missing
 * neighbour in that direction always keeps that wall standing). An open
 * move advances `position` and increments `moves`; landing exactly on
 * `maze.goal` flips `status` to `'reached_goal'` (scoring happens once, in
 * `evaluateRound`, never here). A round that already reached its goal is
 * returned unchanged -- no further move counts once the food is found.
 */
function applyMove(round, direction) {
  if (!round || round.status !== 'playing') {
    return round;
  }

  if (!isValidDirection(direction)) {
    throw new Error(`direction must be one of ${MOVE_DIRECTIONS.join(', ')}`);
  }

  if (isMoveBlocked(round, direction)) {
    return Object.assign({}, round, { blocked: true, lastDirection: direction });
  }

  const move = MOVE_DELTAS[direction];
  const nextPosition = {
    row: round.position.row + move.deltaRow,
    col: round.position.col + move.deltaCol,
  };
  const reachedGoal = nextPosition.row === round.maze.goal.row && nextPosition.col === round.maze.goal.col;

  return Object.assign({}, round, {
    position: nextPosition,
    moves: round.moves + 1,
    blocked: false,
    lastDirection: direction,
    status: reachedGoal ? 'reached_goal' : 'playing',
  });
}

/**
 * Scores a round exactly once, the moment it reaches its goal (throws if
 * called before that). A second call on an already-evaluated round is a
 * no-op that returns the same round/gameState untouched, so a caller that
 * accidentally re-evaluates (e.g. a double click) never double-scores.
 *
 * Reaching the goal is always a success (there is no "wrong" maze exit), so
 * this always applies `scoring.applyAnswer(gameState.score, true)` -- reused
 * from the same scoring module Quiz applies its answers with -- and appends
 * an answer entry shaped like gameFlow.js's `answers` (`isCorrect: true`),
 * so `gameFlow.calculateMaxStreak` folds over Laberinto rounds unchanged.
 */
function evaluateRound(round, gameState) {
  if (round && round.evaluated) {
    return { round, gameState };
  }

  if (!round || round.status !== 'reached_goal') {
    throw new Error('evaluateRound requires a round whose status is "reached_goal"');
  }

  const scored = scoring.applyAnswer(gameState.score, true);
  const answer = {
    roundIndex: round.roundIndex,
    dinosaur: round.dinosaur,
    diet: round.diet,
    food: round.food,
    moves: round.moves,
    isCorrect: true,
  };

  return {
    round: Object.assign({}, round, { status: 'completed', evaluated: true }),
    gameState: {
      score: scored.score,
      questionIndex: gameState.questionIndex + 1,
      answers: gameState.answers.concat([answer]),
    },
  };
}

/**
 * Starts a fresh Laberinto game: gameFlow.js's own initial state shape
 * (`{ score, questionIndex, answers }`, reused verbatim) plus the first of
 * ROUNDS_PER_GAME rounds. `options.level` must be a valid gameFlow.js level
 * (1-10); `options.seed` seeds every round's maze deterministically.
 */
function startGame(options) {
  options = options || {};
  const { level } = options;

  if (!gameFlow.isValidLevel(level)) {
    throw new Error(`level must be an integer between ${gameFlow.MIN_LEVEL} and ${gameFlow.MAX_LEVEL}`);
  }

  return {
    level,
    seed: options.seed,
    state: gameFlow.createInitialGameState(),
    round: startRound({
      roundIndex: 0,
      level,
      seed: options.seed,
      previousDinosaurId: null,
      randomFn: options.randomFn,
      dinosaurPool: options.dinosaurPool,
      getCreatureSheet: options.getCreatureSheet,
      logService: options.logService,
    }),
  };
}

/**
 * Composes `evaluateRound` with `startRound` for the next round (mirrors
 * gameFlow.js's `completeLevel` composing `resolveLevelOutcome`+`startLevel`):
 * scores the just-finished round and, unless it was the game's last round
 * (ROUNDS_PER_GAME), also starts round `round.roundIndex + 1`, attached as
 * `nextRound`, so a caller advances a full round in one call.
 */
function completeRound(params) {
  params = params || {};
  const { round, gameState, level, seed } = params;
  const evaluated = evaluateRound(round, gameState);
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
      seed,
      previousDinosaurId: evaluated.round.dinosaur,
      randomFn: params.randomFn,
      dinosaurPool: params.dinosaurPool,
      getCreatureSheet: params.getCreatureSheet,
      logService: params.logService,
    }),
  };
}

module.exports = {
  ROUNDS_PER_GAME,
  MODE_ID,
  FOODS,
  DIET_TO_FOOD,
  MOVE_DIRECTIONS,
  getGoalFood,
  pickDinosaur,
  startRound,
  applyMove,
  evaluateRound,
  startGame,
  completeRound,
};
