'use strict';

/**
 * Round/game orchestration for the Clasifica mode, as driven by the app
 * shell (public/scripts/main.js) at runtime.
 *
 * Browser bridge: `src/game/classifyGame.js` (TRIOFSND-279) already
 * implements this exact orchestration, but it unconditionally `require`s
 * `src/data/creatureSheet` and `src/data/questionBank` -- both transitively
 * `require('fs')` to read the question bank off disk, which does not exist
 * in a real, unbundled browser. That module stays as-is (it is still the
 * Node/Jest reference implementation, exercised by
 * src/game/classifyGame.test.js against the real, verified creature
 * fichas).
 *
 * This file is therefore a second, browser-runnable implementation of the
 * same round/game state machine, following the exact precedent
 * public/scripts/mazeGame.js set for Laberinto: it resolves
 * `scoring`/`gameFlow`/the logging service the same require-or-
 * `window.DinoQuiz` way every other public/scripts module does, and its
 * local `DINOSAUR_DIETS` below is a small, static mirror of
 * src/data/creatureSheet.js's `CREATURE_SHEETS` (diet field only) and
 * src/data/questionBank.js's `VALID_DINOSAURS` -- the same table
 * public/scripts/mazeGame.js already mirrors by hand for the same reason.
 * Keep all three in sync (guarded by tests/pwa/classify-game-browser.test.js).
 *
 * Registers on `window.DinoQuiz.game.classify` (nested, so it never clobbers
 * gameFlow.js's own flat `window.DinoQuiz.game` properties, same as
 * `window.DinoQuiz.game.maze`) for the `<script>`-loaded PWA, and
 * `module.exports` for Node/Jest -- consumed by
 * public/scripts/classifyScreen.js's `resolveClassifyGame`.
 */

(function () {
  var ROUNDS_PER_GAME = 10;
  var MODE_ID = 'clasifica';

  var CATEGORIES = Object.freeze({
    CARNIVORO: 'carnivoro',
    HERBIVORO: 'herbivoro',
    OMNIVORO: 'omnivoro',
  });
  var VALID_CATEGORIES = Object.freeze(Object.keys(CATEGORIES).map(function (key) {
    return CATEGORIES[key];
  }));

  // Mirrors src/data/creatureSheet.js's CREATURE_SHEETS diet field and
  // src/data/questionBank.js's VALID_DINOSAURS -- see the module doc comment
  // above for why this is a local, static duplicate instead of a `require`
  // (same table public/scripts/mazeGame.js's own DINOSAUR_DIETS mirrors).
  // pachycephalosaurus is omnivoro, not herbivoro -- see
  // src/data/creatureSheet.js's own comment on that entry (its funFacts
  // already verify a mixed plant-and-animal diet).
  var DINOSAUR_DIETS = Object.freeze({
    trex: 'carnivoro',
    triceratops: 'herbivoro',
    velociraptor: 'carnivoro',
    estegosaurio: 'herbivoro',
    braquiosaurio: 'herbivoro',
    ankylosaurus: 'herbivoro',
    pteranodon: 'carnivoro',
    spinosaurus: 'carnivoro',
    dilophosaurus: 'carnivoro',
    pachycephalosaurus: 'omnivoro',
    compsognathus: 'carnivoro',
    diplodocus: 'herbivoro',
    iguanodon: 'herbivoro',
    parasaurolophus: 'herbivoro',
  });
  var DEFAULT_DINOSAUR_POOL = Object.freeze(Object.keys(DINOSAUR_DIETS));

  // Mirrors src/game/modesCatalog.js's MODES_CATALOG entry for
  // MODE_IDS.CLASIFICA (minCreaturesWithField on "diet", minCount 6,
  // requireAllCategories the three CATEGORIES).
  var CLASSIFY_MODE_MIN_CREATURES = 6;
  var CLASSIFY_MODE_REQUIRED_CATEGORIES = VALID_CATEGORIES;

  // Local, machine-readable diagnostic codes for the controlled guard --
  // mirrors src/game/classifyGame.js's own DIAGNOSTIC_CODES exactly.
  var DIAGNOSTIC_CODES = Object.freeze({
    MISSING_CREATURE_SHEET: 'classify_missing_creature_sheet',
    INVALID_CREATURE_DIET: 'classify_invalid_creature_diet',
  });

  function isValidCategory(category) {
    return VALID_CATEGORIES.indexOf(category) !== -1;
  }

  /** Resolves src/data/creatureSheet.js the require-or-null way, mirroring shadowGuessGame.js's own resolveCreatureSheetModule. */
  function resolveCreatureSheetModule() {
    return typeof require === 'function' ? require('../../src/data/creatureSheet') : null;
  }

  /**
   * Whether Clasifica has enough verified creatures to unlock (PRD/
   * MODES_CATALOG requirement: >=6 creatures with a verified diet, covering
   * carnivoro/herbivoro/omnivoro). Prefers the real, verified
   * `src/data/creatureSheet.js#isClassifyModeUnlocked` under Node/Jest;
   * falls back to counting the local `DINOSAUR_DIETS` mirror above when
   * `require` isn't available (real, unbundled browser), mirroring
   * shadowGuessGame.js's own `isShadowModeUnlocked`.
   */
  function isClassifyModeUnlocked() {
    var creatureSheetModule = resolveCreatureSheetModule();
    if (creatureSheetModule && typeof creatureSheetModule.isClassifyModeUnlocked === 'function') {
      return creatureSheetModule.isClassifyModeUnlocked();
    }

    var dinosaurIds = Object.keys(DINOSAUR_DIETS);
    if (dinosaurIds.length < CLASSIFY_MODE_MIN_CREATURES) {
      return false;
    }
    return CLASSIFY_MODE_REQUIRED_CATEGORIES.every(function (category) {
      return dinosaurIds.some(function (id) { return DINOSAUR_DIETS[id] === category; });
    });
  }

  /** Resolves public/scripts/scoring.js the require-or-window way every public/scripts module does. */
  function resolveScoring() {
    if (typeof require === 'function') {
      return require('./scoring');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.scoring) || null;
  }

  /** Resolves public/scripts/gameFlow.js the same way (only isValidLevel/createInitialGameState are used here). */
  function resolveGameFlow() {
    if (typeof require === 'function') {
      return require('./gameFlow');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game) || null;
  }

  var noopLogService = { logEvent: function () {} };
  var defaultLogService;

  /** Lazily resolves a shared LogService, mirroring mazeGame.js's own default resolution. */
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

  var noopDiagnostics = { incrementCounter: function () {}, recordError: function () {} };
  var defaultDiagnostics;

  /** Lazily resolves src/services/diagnostics.js, same dual pattern as resolveDefaultLogService above. */
  function resolveDefaultDiagnostics() {
    if (defaultDiagnostics) {
      return defaultDiagnostics;
    }

    var diagnosticsModule =
      typeof require === 'function'
        ? require('../../src/services/diagnostics')
        : (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.services && window.DinoQuiz.services.diagnostics);

    defaultDiagnostics = diagnosticsModule && typeof diagnosticsModule.incrementCounter === 'function' ? diagnosticsModule : noopDiagnostics;

    return defaultDiagnostics;
  }

  /**
   * Picks a creature for a round: uniformly at random from `pool`, excluding
   * `previousDinosaurId` when the pool has another option -- so the 10
   * rounds of a game never show the same creature twice in a row.
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
   * Starts round `roundIndex` (0-based, < ROUNDS_PER_GAME): picks a creature
   * (never a repeat of `options.previousDinosaurId`). Mirrors
   * src/game/classifyGame.js's own `startRound` exactly -- it never reads
   * the creature's diet, that only happens once the player answers, in
   * `evaluateRound`.
   */
  function startRound(options) {
    options = options || {};
    var roundIndex = options.roundIndex;
    var level = options.level;

    if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= ROUNDS_PER_GAME) {
      throw new Error('roundIndex must be an integer between 0 and ' + (ROUNDS_PER_GAME - 1));
    }

    var dinosaur = pickDinosaur(options.previousDinosaurId, {
      dinosaurPool: options.dinosaurPool,
      randomFn: options.randomFn,
    });

    return {
      roundIndex: roundIndex,
      level: level,
      dinosaur: dinosaur,
      status: 'playing',
      evaluated: false,
    };
  }

  /**
   * The creature's diet, resolved from `options.getCreatureSheet` when given
   * (tests/injected callers) else the local `DINOSAUR_DIETS` mirror above.
   * Returns `{ diet }` when it resolves to one of CATEGORIES' three values,
   * or `{ error: DIAGNOSTIC_CODES.* }` otherwise -- a controlled result,
   * never a throw, mirroring src/game/classifyGame.js's own
   * `resolveVerifiedDiet`.
   */
  function resolveVerifiedDiet(dinosaurId, options) {
    options = options || {};
    var diet;

    if (typeof options.getCreatureSheet === 'function') {
      var sheet = options.getCreatureSheet(dinosaurId);
      diet = sheet && sheet.diet;
    } else {
      diet = DINOSAUR_DIETS[dinosaurId];
    }

    if (!diet) {
      return { error: DIAGNOSTIC_CODES.MISSING_CREATURE_SHEET };
    }
    if (!isValidCategory(diet)) {
      return { error: DIAGNOSTIC_CODES.INVALID_CREATURE_DIET };
    }
    return { diet: diet };
  }

  /**
   * Evaluates the player's `category` guess for `round` exactly once,
   * mirroring src/game/classifyGame.js's own `evaluateRound` (see that
   * module's doc comment for the full controlled-guard rationale): a
   * creature whose diet can't be verified blocks only this round (no score,
   * no answers entry) and logs `classify_round_blocked` with a local
   * diagnostic code, never the player's guess.
   */
  function evaluateRound(round, gameState, category, options) {
    options = options || {};

    if (round && round.evaluated) {
      return { round: round, gameState: gameState };
    }

    if (!round || round.status !== 'playing') {
      throw new Error('evaluateRound requires a round whose status is "playing"');
    }

    if (!isValidCategory(category)) {
      throw new Error('category must be one of ' + VALID_CATEGORIES.join(', '));
    }

    var verified = resolveVerifiedDiet(round.dinosaur, { getCreatureSheet: options.getCreatureSheet });

    if (verified.error) {
      var logService = options.logService || resolveDefaultLogService();
      logService.logEvent('classify_round_blocked', {
        code: verified.error,
        mode: MODE_ID,
        level: round.level,
        roundIndex: round.roundIndex,
      });
      // PRD failure point "ficha ausente" (TRIOFSND-318): the stable
      // diagnostic code alone, never round.dinosaur/category.
      var diagnostics = options.diagnostics || resolveDefaultDiagnostics();
      diagnostics.recordError(MODE_ID, 'data', verified.error);

      return {
        round: Object.assign({}, round, { status: 'blocked', evaluated: true, diagnosticCode: verified.error }),
        gameState: gameState,
      };
    }

    var scoring = resolveScoring();
    var isCorrect = category === verified.diet;
    var scored = scoring.applyAnswer(gameState.score, isCorrect);
    var answer = {
      roundIndex: round.roundIndex,
      dinosaur: round.dinosaur,
      diet: verified.diet,
      category: category,
      isCorrect: isCorrect,
    };

    return {
      round: Object.assign({}, round, { status: 'completed', evaluated: true, diet: verified.diet, category: category, isCorrect: isCorrect }),
      gameState: {
        score: scored.score,
        questionIndex: gameState.questionIndex + 1,
        answers: gameState.answers.concat([answer]),
      },
    };
  }

  /**
   * Starts a fresh Clasifica game: gameFlow.js's own initial state shape
   * plus the first of ROUNDS_PER_GAME rounds. Mirrors
   * src/game/classifyGame.js's own `startGame`.
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
      state: gameFlow.createInitialGameState(),
      round: startRound({
        roundIndex: 0,
        level: level,
        previousDinosaurId: null,
        randomFn: options.randomFn,
        dinosaurPool: options.dinosaurPool,
      }),
    };
  }

  /**
   * Composes `evaluateRound` with `startRound` for the next round: evaluates
   * the just-answered round and, unless it was the game's last round, also
   * starts the next one, attached as `nextRound`. Mirrors
   * src/game/classifyGame.js's own `completeRound`.
   */
  function completeRound(params) {
    params = params || {};
    var round = params.round;
    var gameState = params.gameState;
    var level = params.level;
    var category = params.category;

    var evaluated = evaluateRound(round, gameState, category, {
      getCreatureSheet: params.getCreatureSheet,
      logService: params.logService,
    });
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
        previousDinosaurId: evaluated.round.dinosaur,
        randomFn: params.randomFn,
        dinosaurPool: params.dinosaurPool,
      }),
    };
  }

  var api = {
    ROUNDS_PER_GAME: ROUNDS_PER_GAME,
    MODE_ID: MODE_ID,
    CATEGORIES: CATEGORIES,
    DIAGNOSTIC_CODES: DIAGNOSTIC_CODES,
    DEFAULT_DINOSAUR_POOL: DEFAULT_DINOSAUR_POOL,
    CLASSIFY_MODE_MIN_CREATURES: CLASSIFY_MODE_MIN_CREATURES,
    CLASSIFY_MODE_REQUIRED_CATEGORIES: CLASSIFY_MODE_REQUIRED_CATEGORIES,
    isClassifyModeUnlocked: isClassifyModeUnlocked,
    pickDinosaur: pickDinosaur,
    startRound: startRound,
    resolveVerifiedDiet: resolveVerifiedDiet,
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
    window.DinoQuiz.game.classify = api;
  }
})();
