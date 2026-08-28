'use strict';

/**
 * Round/level orchestration for the Adivina la sombra mode, as driven by the
 * app shell (TRIOFSND-265, public/scripts/main.js) at runtime.
 *
 * Browser bridge: `src/game/shadowGuessRound.js` (TRIOFSND-262) already
 * implements round generation, but it unconditionally `require`s
 * `src/data/creatureSheet`, which itself `require`s `src/data/questionBank` --
 * both transitively `require('fs')` to read the question bank off disk, which
 * does not exist in a real, unbundled browser. That module stays as-is (it is
 * still the Node/Jest reference implementation, exercised by
 * src/game/shadowGuessRound.test.js).
 *
 * This file is therefore a second, browser-runnable implementation of the
 * same round-generation rules, following the dual CommonJS/global pattern of
 * public/scripts/mazeGame.js (see that file's own doc comment for the exact
 * same rationale). The one piece that cannot be resolved the require-or-
 * `window.DinoQuiz` way in a real browser is the approved-creature shadow
 * metadata, so `APPROVED_SHADOW_CREATURES` below is a small, static local
 * mirror of src/data/creatureSheet.js's `CREATURE_SHEETS` (id, visualFamily
 * and shadowMeta.allowedTransforms only -- the fields round generation
 * actually reads) -- the same "local, tiny lookup" precedent
 * public/scripts/mazeGame.js already set for its own `DINOSAUR_DIETS`. Keep
 * both in sync.
 *
 * Unlike Laberinto (a single fixed-level game per hash route), Adivina la
 * sombra plays through the same multi-level unlock chain as Quiz
 * (gameFlow.js's `resolveLevelOutcome`, scoped to this mode's own
 * unlockThresholds.js entry) -- `startLevel`/`completeLevel` below mirror
 * gameFlow.js's own `startLevel`/`completeLevel` shape exactly, but generate
 * this mode's own procedural silhouette rounds instead of pulling from the
 * question bank.
 *
 * Registers on `window.DinoQuiz.game.shadowGuess` (nested, so it never
 * clobbers gameFlow.js's own flat `window.DinoQuiz.game` properties) for the
 * `<script>`-loaded PWA and `module.exports` for Node/Jest.
 */

(function () {
  var ROUNDS_PER_GAME = 10;
  var OPTIONS_PER_ROUND = 4;
  var DISTRACTORS_PER_ROUND = OPTIONS_PER_ROUND - 1;
  var MODE_ID = 'sombra';

  var SHADOW_TRANSFORMS = Object.freeze({
    FLIP_HORIZONTAL: 'flipHorizontal',
    ROTATE_90: 'rotate90',
    ROTATE_180: 'rotate180',
  });

  var TRANSFORM_NONE = null;

  // Mirrors src/game/shadowGuessRound.js's own level gates.
  var LEVEL_UNLOCKS_FLIP = 4;
  var LEVEL_UNLOCKS_ADVANCED_TRANSFORMS = 7;

  // Mirrors src/game/shadowGuessRound.js's GAME_AREA/SILHOUETTE_BOX_BY_VISUAL_FAMILY.
  var GAME_AREA = Object.freeze({ width: 320, height: 240 });
  var SILHOUETTE_BOX_BY_VISUAL_FAMILY = Object.freeze({
    biped_carnivore: Object.freeze({ width: 140, height: 220 }),
    biped_herbivore: Object.freeze({ width: 160, height: 210 }),
    armored_quadruped: Object.freeze({ width: 260, height: 140 }),
    long_neck_quadruped: Object.freeze({ width: 300, height: 200 }),
    flying_reptile: Object.freeze({ width: 300, height: 110 }),
  });

  var GROUND_TRANSFORMS = Object.freeze([SHADOW_TRANSFORMS.FLIP_HORIZONTAL]);
  var FLYER_TRANSFORMS = Object.freeze([
    SHADOW_TRANSFORMS.FLIP_HORIZONTAL,
    SHADOW_TRANSFORMS.ROTATE_90,
    SHADOW_TRANSFORMS.ROTATE_180,
  ]);

  // Local browser mirror of src/data/creatureSheet.js's CREATURE_SHEETS
  // shadowMeta.approved roster -- see the module doc comment above for why
  // this is a local, static duplicate instead of a `require`. Compsognathus
  // is intentionally excluded here (unapproved shadowMeta, per that file's
  // own doc comment on its silhouette being too generic at this scale).
  var APPROVED_SHADOW_CREATURES = Object.freeze({
    trex: Object.freeze({ visualFamily: 'biped_carnivore', allowedTransforms: GROUND_TRANSFORMS }),
    triceratops: Object.freeze({ visualFamily: 'armored_quadruped', allowedTransforms: GROUND_TRANSFORMS }),
    velociraptor: Object.freeze({ visualFamily: 'biped_carnivore', allowedTransforms: GROUND_TRANSFORMS }),
    estegosaurio: Object.freeze({ visualFamily: 'armored_quadruped', allowedTransforms: GROUND_TRANSFORMS }),
    braquiosaurio: Object.freeze({ visualFamily: 'long_neck_quadruped', allowedTransforms: GROUND_TRANSFORMS }),
    ankylosaurus: Object.freeze({ visualFamily: 'armored_quadruped', allowedTransforms: GROUND_TRANSFORMS }),
    pteranodon: Object.freeze({ visualFamily: 'flying_reptile', allowedTransforms: FLYER_TRANSFORMS }),
    spinosaurus: Object.freeze({ visualFamily: 'biped_carnivore', allowedTransforms: GROUND_TRANSFORMS }),
    dilophosaurus: Object.freeze({ visualFamily: 'biped_carnivore', allowedTransforms: GROUND_TRANSFORMS }),
    pachycephalosaurus: Object.freeze({ visualFamily: 'biped_herbivore', allowedTransforms: GROUND_TRANSFORMS }),
    diplodocus: Object.freeze({ visualFamily: 'long_neck_quadruped', allowedTransforms: GROUND_TRANSFORMS }),
    iguanodon: Object.freeze({ visualFamily: 'biped_herbivore', allowedTransforms: GROUND_TRANSFORMS }),
    parasaurolophus: Object.freeze({ visualFamily: 'biped_herbivore', allowedTransforms: GROUND_TRANSFORMS }),
  });
  var APPROVED_SHADOW_CREATURE_IDS = Object.freeze(Object.keys(APPROVED_SHADOW_CREATURES));
  var SHADOW_MODE_MIN_APPROVED = 12;

  // Mirrors src/data/creatureSheet.js's SHADOW_INDISTINGUISHABLE_PAIRS.
  var SHADOW_INDISTINGUISHABLE_PAIRS = Object.freeze([
    Object.freeze(['braquiosaurio', 'diplodocus']),
    Object.freeze(['velociraptor', 'dilophosaurus']),
    Object.freeze(['iguanodon', 'parasaurolophus']),
  ]);

  var ERRORS = Object.freeze({
    CATALOG_TOO_SMALL: 'shadow_round_catalog_too_small',
    NOT_ENOUGH_DISTRACTORS: 'shadow_round_not_enough_distractors',
    SILHOUETTE_OUT_OF_BOUNDS: 'shadow_round_silhouette_out_of_bounds',
    LEVEL_GENERATION_FAILED: 'shadow_level_generation_failed',
  });

  /** Resolves public/scripts/gameFlow.js the require-or-window way every public/scripts module does. */
  function resolveGameFlow() {
    if (typeof require === 'function') {
      return require('./gameFlow');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game) || null;
  }

  /** Resolves src/data/creatureSheet.js under Node/Jest only (see the module doc comment for why the browser has no such path). */
  function resolveCreatureSheetModule() {
    return typeof require === 'function' ? require('../../src/data/creatureSheet') : null;
  }

  var noopLogService = { logEvent: function () {} };
  var defaultLogService;

  /** Lazily resolves a shared LogService, mirroring mazeGame.js's own resolution. */
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
   * Whether Adivina la sombra has enough approved creatures to unlock (PRD/
   * modesCatalog.js requirement: >=12 visually differentiable creatures).
   * Prefers the real, verified `src/data/creatureSheet.js#isShadowModeUnlocked`
   * under Node/Jest; falls back to counting the local browser mirror above
   * when `require` isn't available (see the module doc comment).
   */
  function isShadowModeUnlocked() {
    var creatureSheetModule = resolveCreatureSheetModule();
    if (creatureSheetModule && typeof creatureSheetModule.isShadowModeUnlocked === 'function') {
      return creatureSheetModule.isShadowModeUnlocked();
    }
    return APPROVED_SHADOW_CREATURE_IDS.length >= SHADOW_MODE_MIN_APPROVED;
  }

  /** The creature's natural (untransformed) silhouette box, or `null` when its visual family is unknown -- never guessed. */
  function getSilhouetteBox(dinosaurId) {
    var creature = APPROVED_SHADOW_CREATURES[dinosaurId];
    var box = creature && SILHOUETTE_BOX_BY_VISUAL_FAMILY[creature.visualFamily];
    return box ? { width: box.width, height: box.height } : null;
  }

  /** `box` after `transform`; mirrors src/game/shadowGuessRound.js's own `applyTransformToBox`. */
  function applyTransformToBox(box, transform) {
    if (transform === SHADOW_TRANSFORMS.ROTATE_90) {
      return { width: box.height, height: box.width };
    }
    return { width: box.width, height: box.height };
  }

  /** Whether `box` fits inside `gameArea` (defaults to GAME_AREA) on both axes. */
  function fitsWithinGameArea(box, gameArea) {
    var area = gameArea || GAME_AREA;
    return box.width <= area.width && box.height <= area.height;
  }

  /** The transforms `level` unlocks, filtered to `creatureAllowedTransforms` -- mirrors shadowGuessRound.js's `transformsUnlockedByLevel`. */
  function transformsUnlockedByLevel(level, creatureAllowedTransforms) {
    if (!Number.isInteger(level) || level < LEVEL_UNLOCKS_FLIP) {
      return [];
    }
    if (level < LEVEL_UNLOCKS_ADVANCED_TRANSFORMS) {
      return creatureAllowedTransforms.filter(function (transform) {
        return transform === SHADOW_TRANSFORMS.FLIP_HORIZONTAL;
      });
    }
    return creatureAllowedTransforms.slice();
  }

  /** Every transform (identity plus whatever the level grants) that also fits the game area -- mirrors shadowGuessRound.js's `validTransformOptions`. */
  function validTransformOptions(dinosaurId, level) {
    var creature = APPROVED_SHADOW_CREATURES[dinosaurId];
    var box = getSilhouetteBox(dinosaurId);

    if (!creature || !box) {
      return [];
    }

    var candidates = [TRANSFORM_NONE].concat(transformsUnlockedByLevel(level, creature.allowedTransforms || []));

    return candidates.filter(function (transform) {
      return fitsWithinGameArea(applyTransformToBox(box, transform), GAME_AREA);
    });
  }

  /** Whether `idA`/`idB` are cataloged as indistinguishable (order-independent), per `pairs` (defaults to SHADOW_INDISTINGUISHABLE_PAIRS). */
  function areIndistinguishable(idA, idB, pairs) {
    var list = pairs || SHADOW_INDISTINGUISHABLE_PAIRS;
    return list.some(function (pair) {
      return (pair[0] === idA && pair[1] === idB) || (pair[0] === idB && pair[1] === idA);
    });
  }

  /** Whether `candidateId` is indistinguishable from none of `chosenIds`. */
  function isCompatibleDistractor(candidateId, chosenIds, pairs) {
    return chosenIds.every(function (chosenId) {
      return !areIndistinguishable(candidateId, chosenId, pairs);
    });
  }

  /** Picks `count` creatures from `pool`, distinct from and never indistinguishable from `targetId` or each other -- mirrors shadowGuessRound.js's `pickDistractors`. */
  function pickDistractors(targetId, pool, count, randomFn, pairs) {
    var gameFlow = resolveGameFlow();
    var shuffled = gameFlow.shuffle(
      pool.filter(function (id) {
        return id !== targetId;
      }),
      randomFn
    );
    var chosen = [targetId];
    var distractors = [];

    shuffled.forEach(function (candidateId) {
      if (distractors.length >= count) {
        return;
      }
      if (isCompatibleDistractor(candidateId, chosen, pairs)) {
        distractors.push(candidateId);
        chosen.push(candidateId);
      }
    });

    return distractors;
  }

  /** Picks the round's correct creature: uniform random from `pool`, excluding `previousDinosaurId` when the pool has another option. */
  function pickTarget(previousDinosaurId, pool, randomFn) {
    var candidates = pool.length > 1
      ? pool.filter(function (id) {
          return id !== previousDinosaurId;
        })
      : pool;
    var index = Math.floor(randomFn() * candidates.length);
    return candidates[Math.min(index, candidates.length - 1)];
  }

  /**
   * Generates round `roundIndex` (0-based, < ROUNDS_PER_GAME) of an Adivina
   * la sombra game at `level` -- mirrors src/game/shadowGuessRound.js's
   * `generateShadowRound` exactly (see that file's own doc comment).
   */
  function generateShadowRound(options) {
    options = options || {};
    var roundIndex = options.roundIndex;
    var level = options.level;
    var gameFlow = resolveGameFlow();

    if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= ROUNDS_PER_GAME) {
      throw new Error('roundIndex must be an integer between 0 and ' + (ROUNDS_PER_GAME - 1));
    }
    if (!gameFlow || !gameFlow.isValidLevel(level)) {
      throw new Error('level must be a valid gameFlow level');
    }

    var randomFn = options.randomFn || Math.random;

    if (APPROVED_SHADOW_CREATURE_IDS.length < SHADOW_MODE_MIN_APPROVED) {
      return {
        error: ERRORS.CATALOG_TOO_SMALL,
        details: { need: SHADOW_MODE_MIN_APPROVED, have: APPROVED_SHADOW_CREATURE_IDS.length },
      };
    }

    var target = pickTarget(options.previousDinosaurId, APPROVED_SHADOW_CREATURE_IDS, randomFn);

    var transformOptions = validTransformOptions(target, level);
    if (transformOptions.length === 0) {
      return { error: ERRORS.SILHOUETTE_OUT_OF_BOUNDS, details: { dinosaurId: target } };
    }
    var transformIndex = Math.min(Math.floor(randomFn() * transformOptions.length), transformOptions.length - 1);
    var transform = transformOptions[transformIndex];

    var distractors = pickDistractors(target, APPROVED_SHADOW_CREATURE_IDS, DISTRACTORS_PER_ROUND, randomFn, options.indistinguishablePairs);
    if (distractors.length < DISTRACTORS_PER_ROUND) {
      return {
        error: ERRORS.NOT_ENOUGH_DISTRACTORS,
        details: { dinosaurId: target, need: DISTRACTORS_PER_ROUND, have: distractors.length },
      };
    }

    var shuffledOptions = gameFlow.shuffle([target].concat(distractors), randomFn);

    return {
      roundIndex: roundIndex,
      level: level,
      correctId: target,
      options: shuffledOptions,
      transform: transform,
      status: 'playing',
    };
  }

  /** Generates all ROUNDS_PER_GAME rounds of one game at `options.level` -- mirrors shadowGuessRound.js's `generateShadowRounds`. */
  function generateShadowRounds(options) {
    options = options || {};
    var rounds = [];
    var previousDinosaurId = options.previousDinosaurId;

    for (var roundIndex = 0; roundIndex < ROUNDS_PER_GAME; roundIndex += 1) {
      var round = generateShadowRound({
        roundIndex: roundIndex,
        level: options.level,
        randomFn: options.randomFn,
        previousDinosaurId: previousDinosaurId,
        indistinguishablePairs: options.indistinguishablePairs,
      });

      if (round.error) {
        return { error: round.error, details: round.details };
      }

      rounds.push(round);
      previousDinosaurId = round.correctId;
    }

    return { rounds: rounds };
  }

  /**
   * Starts a level: generates its ROUNDS_PER_GAME rounds up front (mirrors
   * gameFlow.js's `startLevel` shape). When round generation fails (catalog
   * too small/geometry impossible), no game is started: a
   * `shadow_level_generation_failed` diagnostic is logged and an error result
   * is returned instead of throwing -- exactly like gameFlow.js's own
   * `startLevel` on an under-stocked question pool.
   */
  function startLevel(level, options) {
    options = options || {};
    var gameFlow = resolveGameFlow();

    if (!gameFlow || !gameFlow.isValidLevel(level)) {
      throw new Error('level must be a valid gameFlow level');
    }

    var logService = options.logService || resolveDefaultLogService();
    var generated = generateShadowRounds({
      level: level,
      randomFn: options.randomFn,
      previousDinosaurId: options.previousDinosaurId,
      indistinguishablePairs: options.indistinguishablePairs,
    });

    if (generated.error) {
      logService.logEvent(ERRORS.LEVEL_GENERATION_FAILED, { code: generated.error, mode: MODE_ID, level: level });
      return { error: ERRORS.LEVEL_GENERATION_FAILED, level: level, code: generated.error };
    }

    return {
      level: level,
      state: gameFlow.createInitialGameState(),
      rounds: generated.rounds,
    };
  }

  /**
   * Composes `gameFlow.resolveLevelOutcome` (scoped to this mode's own
   * unlockThresholds.js entry, MODE_ID) with the `startLevel` above: resolves
   * what happens once a level's ROUNDS_PER_GAME rounds are all answered and,
   * when a next level unlocks, also starts it (attached as `nextLevelGame`).
   * Mirrors gameFlow.js's own `completeLevel` exactly, but generating this
   * mode's procedural rounds instead of pulling from the question bank.
   */
  function completeLevel(params) {
    params = params || {};
    var gameFlow = resolveGameFlow();
    var outcome = gameFlow.resolveLevelOutcome({
      level: params.level,
      answers: params.answers,
      modeId: MODE_ID,
    });

    if (outcome.gameOver) {
      return outcome;
    }

    outcome.nextLevelGame = startLevel(outcome.nextLevel, params);
    return outcome;
  }

  var api = {
    ROUNDS_PER_GAME: ROUNDS_PER_GAME,
    OPTIONS_PER_ROUND: OPTIONS_PER_ROUND,
    DISTRACTORS_PER_ROUND: DISTRACTORS_PER_ROUND,
    MODE_ID: MODE_ID,
    SHADOW_TRANSFORMS: SHADOW_TRANSFORMS,
    LEVEL_UNLOCKS_FLIP: LEVEL_UNLOCKS_FLIP,
    LEVEL_UNLOCKS_ADVANCED_TRANSFORMS: LEVEL_UNLOCKS_ADVANCED_TRANSFORMS,
    GAME_AREA: GAME_AREA,
    SILHOUETTE_BOX_BY_VISUAL_FAMILY: SILHOUETTE_BOX_BY_VISUAL_FAMILY,
    APPROVED_SHADOW_CREATURE_IDS: APPROVED_SHADOW_CREATURE_IDS,
    SHADOW_MODE_MIN_APPROVED: SHADOW_MODE_MIN_APPROVED,
    SHADOW_INDISTINGUISHABLE_PAIRS: SHADOW_INDISTINGUISHABLE_PAIRS,
    ERRORS: ERRORS,
    isShadowModeUnlocked: isShadowModeUnlocked,
    getSilhouetteBox: getSilhouetteBox,
    applyTransformToBox: applyTransformToBox,
    fitsWithinGameArea: fitsWithinGameArea,
    transformsUnlockedByLevel: transformsUnlockedByLevel,
    validTransformOptions: validTransformOptions,
    areIndistinguishable: areIndistinguishable,
    isCompatibleDistractor: isCompatibleDistractor,
    pickDistractors: pickDistractors,
    pickTarget: pickTarget,
    generateShadowRound: generateShadowRound,
    generateShadowRounds: generateShadowRounds,
    startLevel: startLevel,
    completeLevel: completeLevel,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.game = window.DinoQuiz.game || {};
    window.DinoQuiz.game.shadowGuess = api;
  }
})();
