'use strict';

/**
 * Round/game orchestration for the Laberinto mode, as driven by the app
 * shell (TRIOFSND-259, public/scripts/main.js) at runtime.
 *
 * Browser bridge: `src/game/mazeGame.js` (TRIOFSND-256) already implements
 * this exact orchestration, but it unconditionally `require`s
 * `src/data/creatureSheet` and `src/data/questionBank` — both transitively
 * `require('fs')` to read the question bank off disk, which does not exist
 * in a real, unbundled browser. That module stays as-is (it is still the
 * Node/Jest reference implementation, exercised by src/game/mazeGame.test.js
 * — including a test that mocks `./mazeGenerator` by module path, which
 * would break if this file became a re-export shim of it).
 *
 * This file is therefore a second, browser-runnable implementation of the
 * same round/game state machine, following the dual CommonJS/global pattern
 * of public/scripts/gameFlow.js. It resolves `mazeGenerator`/`scoring`/
 * `gameFlow`/the logging service the same require-or-`window.DinoQuiz` way
 * every other public/scripts module does (so under Node/Jest it exercises
 * the exact same generator/scoring/gameFlow code as src/game/mazeGame.js);
 * the one piece that cannot be resolved that way in a real browser is the
 * creature diet -> goal food map, so `DINOSAUR_DIETS` below is a small,
 * static local mirror of src/data/creatureSheet.js's `CREATURE_SHEETS`
 * (diet field only) and src/data/questionBank.js's `VALID_DINOSAURS` — the
 * same "local, tiny lookup" precedent public/scripts/mazeScreen.js already
 * set for its own `MOVE_DELTAS`/`FOOD_ICON` tables. Keep both in sync.
 *
 * Registers on `window.DinoQuiz.game.maze` (nested, so it never clobbers
 * gameFlow.js's own flat `window.DinoQuiz.game` properties) for the
 * `<script>`-loaded PWA and `module.exports` for Node/Jest.
 */

(function () {
  var ROUNDS_PER_GAME = 10;
  var MODE_ID = 'laberinto';

  var FOODS = Object.freeze({
    MEAT: 'carne',
    LEAVES: 'hojas',
    MIXED: 'mixto',
  });

  // Mirrors src/data/creatureSheet.js's CREATURE_SHEETS diet field and
  // src/data/questionBank.js's VALID_DINOSAURS -- see the module doc comment
  // above for why this is a local, static duplicate instead of a `require`.
  var DINOSAUR_DIETS = Object.freeze({
    trex: 'carnivoro',
    triceratops: 'herbivoro',
    velociraptor: 'carnivoro',
    estegosaurio: 'herbivoro',
    braquiosaurio: 'herbivoro',
    ankylosaurus: 'herbivoro',
    pteranodon: 'carnivoro',
  });
  var DEFAULT_DINOSAUR_POOL = Object.freeze(Object.keys(DINOSAUR_DIETS));

  var DIET_TO_FOOD = Object.freeze({
    carnivoro: FOODS.MEAT,
    herbivoro: FOODS.LEAVES,
    omnivoro: FOODS.MIXED,
  });

  var MOVE_DELTAS = Object.freeze({
    up: Object.freeze({ wall: 'N', deltaRow: -1, deltaCol: 0 }),
    down: Object.freeze({ wall: 'S', deltaRow: 1, deltaCol: 0 }),
    left: Object.freeze({ wall: 'W', deltaRow: 0, deltaCol: -1 }),
    right: Object.freeze({ wall: 'E', deltaRow: 0, deltaCol: 1 }),
  });
  var MOVE_DIRECTIONS = Object.freeze(Object.keys(MOVE_DELTAS));

  function isValidDirection(direction) {
    return Object.prototype.hasOwnProperty.call(MOVE_DELTAS, direction);
  }

  /** Resolves public/scripts/mazeGenerator.js the require-or-window way every public/scripts module does. */
  function resolveMazeGenerator() {
    if (typeof require === 'function') {
      return require('./mazeGenerator');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game && window.DinoQuiz.game.mazeGenerator) || null;
  }

  /** Resolves public/scripts/scoring.js the same way. */
  function resolveScoring() {
    if (typeof require === 'function') {
      return require('./scoring');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.scoring) || null;
  }

  /** Resolves public/scripts/gameFlow.js the same way (only createInitialGameState is used here). */
  function resolveGameFlow() {
    if (typeof require === 'function') {
      return require('./gameFlow');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game) || null;
  }

  var noopLogService = { logEvent: function () {} };
  var defaultLogService;

  /** Lazily resolves a shared LogService, mirroring mazeGenerator.js's own resolution. */
  function resolveDefaultLogService() {
    if (defaultLogService) {
      return defaultLogService;
    }

    var loggingModule =
      typeof require === 'function'
        ? require('../../src/services/logging')
        : (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.services && window.DinoQuiz.services.logging);

    defaultLogService =
      loggingModule && typeof loggingModule.LogService === 'function' ? new loggingModule.LogService() : noopLogService;

    return defaultLogService;
  }

  /**
   * The creature's diet and goal food (PRD: carne/hojas/premio mixto),
   * resolved from `options.getCreatureSheet` when given (tests), else the
   * local `DINOSAUR_DIETS` mirror above. Throws for a creature with no card
   * rather than guessing a diet.
   */
  function getGoalFood(dinosaurId, options) {
    options = options || {};
    var diet;

    if (typeof options.getCreatureSheet === 'function') {
      var sheet = options.getCreatureSheet(dinosaurId);
      diet = sheet && sheet.diet;
    } else {
      diet = DINOSAUR_DIETS[dinosaurId];
    }

    if (!diet || !DIET_TO_FOOD[diet]) {
      throw new Error('No verified creature sheet/diet for "' + dinosaurId + '"');
    }

    return { diet: diet, food: DIET_TO_FOOD[diet] };
  }

  /**
   * Picks a creature for a round: uniformly at random from `pool`, excluding
   * `previousDinosaurId` when the pool has another option -- so the 10 rounds
   * of a game never show the same creature twice in a row.
   */
  function pickDinosaur(previousDinosaurId, options) {
    options = options || {};
    var pool = options.dinosaurPool || DEFAULT_DINOSAUR_POOL;
    var random = options.randomFn || Math.random;

    var candidates = pool.length > 1 ? pool.filter(function (id) { return id !== previousDinosaurId; }) : pool;
    var index = Math.floor(random() * candidates.length);
    return candidates[Math.min(index, candidates.length - 1)];
  }

  /**
   * Generates a round's maze, suppressing `generateMaze`'s own generic
   * failure log (it only knows level/seed) so this module logs the single,
   * richer `maze_round_generation_failed` event instead.
   */
  function generateRoundMaze(level, seed, roundIndex, logService) {
    var mazeGenerator = resolveMazeGenerator();
    var maze = mazeGenerator.generateMaze({ seed: seed, level: level, logService: noopLogService });

    if (maze.error) {
      logService.logEvent('maze_round_generation_failed', {
        code: maze.error,
        mode: MODE_ID,
        level: level,
        seed: String(seed),
        roundIndex: roundIndex,
      });
    }

    return maze;
  }

  /**
   * Starts round `roundIndex` (0-based, < ROUNDS_PER_GAME): picks a creature
   * (never a repeat of `options.previousDinosaurId`), generates its maze for
   * `level`, and resolves its goal food from that creature's diet. Returns
   * `{ error, level, seed, roundIndex }` (never a round) when the maze
   * couldn't be generated/verified as solvable.
   */
  function startRound(options) {
    options = options || {};
    var roundIndex = options.roundIndex;
    var level = options.level;

    if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= ROUNDS_PER_GAME) {
      throw new Error('roundIndex must be an integer between 0 and ' + (ROUNDS_PER_GAME - 1));
    }

    var logService = options.logService || resolveDefaultLogService();
    var seed = options.seed + ':' + roundIndex;
    var maze = generateRoundMaze(level, seed, roundIndex, logService);

    if (maze.error) {
      return { error: maze.error, level: level, seed: seed, roundIndex: roundIndex };
    }

    var dinosaur = pickDinosaur(options.previousDinosaurId, {
      dinosaurPool: options.dinosaurPool,
      randomFn: options.randomFn,
    });
    var goalFood = getGoalFood(dinosaur, { getCreatureSheet: options.getCreatureSheet });

    return {
      roundIndex: roundIndex,
      level: level,
      seed: seed,
      dinosaur: dinosaur,
      diet: goalFood.diet,
      food: goalFood.food,
      maze: maze,
      position: { row: maze.start.row, col: maze.start.col },
      moves: 0,
      status: 'playing',
      blocked: false,
      evaluated: false,
    };
  }

  /** Whether `direction` is blocked by a wall from the round's current position. */
  function isMoveBlocked(round, direction) {
    var cell = round.maze.grid[round.position.row][round.position.col];
    return Boolean(cell.walls[MOVE_DELTAS[direction].wall]);
  }

  /**
   * Applies one movement attempt to `round`, mirroring src/game/mazeGame.js's
   * own `applyMove` exactly (see that module's doc comment for the full
   * rationale).
   */
  function applyMove(round, direction) {
    if (!round || round.status !== 'playing') {
      return round;
    }

    if (!isValidDirection(direction)) {
      throw new Error('direction must be one of ' + MOVE_DIRECTIONS.join(', '));
    }

    if (isMoveBlocked(round, direction)) {
      return Object.assign({}, round, { blocked: true, lastDirection: direction });
    }

    var move = MOVE_DELTAS[direction];
    var nextPosition = { row: round.position.row + move.deltaRow, col: round.position.col + move.deltaCol };
    var reachedGoal = nextPosition.row === round.maze.goal.row && nextPosition.col === round.maze.goal.col;

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
   * called before that); a second call on an already-evaluated round is a
   * no-op. Mirrors src/game/mazeGame.js's own `evaluateRound`.
   */
  function evaluateRound(round, gameState) {
    if (round && round.evaluated) {
      return { round: round, gameState: gameState };
    }

    if (!round || round.status !== 'reached_goal') {
      throw new Error('evaluateRound requires a round whose status is "reached_goal"');
    }

    var scoring = resolveScoring();
    var scored = scoring.applyAnswer(gameState.score, true);
    var answer = {
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
   * plus the first of ROUNDS_PER_GAME rounds.
   */
  function startGame(options) {
    options = options || {};
    var level = options.level;
    var gameFlow = resolveGameFlow();

    if (!gameFlow || !gameFlow.isValidLevel(level)) {
      throw new Error('level must be a valid gameFlow level');
    }

    return {
      level: level,
      seed: options.seed,
      state: gameFlow.createInitialGameState(),
      round: startRound({
        roundIndex: 0,
        level: level,
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
   * Composes `evaluateRound` with `startRound` for the next round: scores
   * the just-finished round and, unless it was the game's last round, also
   * starts the next one, attached as `nextRound`.
   */
  function completeRound(params) {
    params = params || {};
    var round = params.round;
    var gameState = params.gameState;
    var level = params.level;
    var seed = params.seed;

    var evaluated = evaluateRound(round, gameState);
    var nextRoundIndex = evaluated.round.roundIndex + 1;

    if (nextRoundIndex >= ROUNDS_PER_GAME) {
      return { gameOver: true, round: evaluated.round, state: evaluated.gameState };
    }

    return {
      gameOver: false,
      round: evaluated.round,
      state: evaluated.gameState,
      nextRound: startRound({
        roundIndex: nextRoundIndex,
        level: level,
        seed: seed,
        previousDinosaurId: evaluated.round.dinosaur,
        randomFn: params.randomFn,
        dinosaurPool: params.dinosaurPool,
        getCreatureSheet: params.getCreatureSheet,
        logService: params.logService,
      }),
    };
  }

  var api = {
    ROUNDS_PER_GAME: ROUNDS_PER_GAME,
    MODE_ID: MODE_ID,
    FOODS: FOODS,
    DIET_TO_FOOD: DIET_TO_FOOD,
    MOVE_DIRECTIONS: MOVE_DIRECTIONS,
    DEFAULT_DINOSAUR_POOL: DEFAULT_DINOSAUR_POOL,
    getGoalFood: getGoalFood,
    pickDinosaur: pickDinosaur,
    startRound: startRound,
    applyMove: applyMove,
    evaluateRound: evaluateRound,
    startGame: startGame,
    completeRound: completeRound,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.game = window.DinoQuiz.game || {};
    window.DinoQuiz.game.maze = api;
  }
})();
