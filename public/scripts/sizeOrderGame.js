'use strict';

/**
 * Round generation/orchestration for the Ordena por tamaño mode, as driven
 * by the app shell (public/scripts/main.js) at runtime.
 *
 * Browser bridge: `src/game/sizeOrderRoundGenerator.js` (TRIOFSND-285)
 * already implements the round-generation algorithm, but it unconditionally
 * `require`s `src/data/creatureSheet` (which transitively `require`s
 * `src/data/questionBank` -> `fs` to read the question bank off disk) --
 * none of which exists in a real, unbundled browser. That module stays as-is
 * (it is still the Node/Jest reference implementation, exercised by its own
 * test suite against the real, verified creature fichas).
 *
 * This file is therefore a second, browser-runnable implementation of the
 * same algorithm, following the exact precedent public/scripts/classifyGame.js
 * set for Clasifica: it resolves the logging service the same require-or-
 * `window.DinoQuiz` way every other public/scripts module does, and its
 * local `DINOSAUR_LENGTHS` below is a small, static mirror of
 * src/data/creatureSheet.js's `CREATURE_SHEETS` (`lengthMeters` field only)
 * -- the same table public/scripts/classifyGame.js already mirrors by hand
 * for the same reason. Keep both in sync (guarded by
 * tests/pwa/size-order-game-browser.test.js).
 *
 * Unlike the seeded, `mazeGenerator.js`-reusing PRNG the Node reference
 * implementation uses for its own determinism-testing needs, this browser
 * twin draws randomness the same way every other roundContract.js-driven
 * mode's browser bridge does (oidoJurasicoScreen.js's
 * `generateOidoJurasicoRound`, shadowGuessGame.js): a plain `randomFn`
 * (defaulting to `Math.random`) threaded through every call, carried on the
 * per-game `context` object `src/game/roundContract.js`'s `startGame` passes
 * back unchanged on every round.
 *
 * `generateSizeOrderRoundForContract(roundIndex, context)` matches
 * roundContract.js's `generateRound(roundIndex, context)` signature exactly
 * -- `main.js` hands it straight to `roundContract.startGame` instead of
 * hand-rolling a tenth "start/evaluate/advance" loop. Round-generation
 * failures (fewer than 3-4 creatures clear `minRelativeDifference`) surface
 * as `{ error: ERRORS.NO_VALID_COMBINATION, ... }`, exactly like the Node
 * reference implementation -- roundContract.js's `buildRound` merges that
 * object into the round unchanged, `public/scripts/sizeOrderScreen.js`'s own
 * `validateRound` then renders its localized "error-de-datos" state instead
 * of a broken board, and `public/scripts/roundDiagnosticsService.js`
 * (attached by main.js) logs the local failure code -- this module itself
 * never persists/logs the failure, mirroring the Node reference
 * implementation's own doc comment.
 *
 * Registers on `window.DinoQuiz.game.sizeOrder` (nested, so it never
 * clobbers gameFlow.js's own flat `window.DinoQuiz.game` properties, same as
 * `window.DinoQuiz.game.maze`/`window.DinoQuiz.game.classify`) for the
 * `<script>`-loaded PWA, and `module.exports` for Node/Jest.
 */

(function () {
  var MIN_CREATURES_PER_ROUND = 3;
  var MAX_CREATURES_PER_ROUND = 4;

  // A creature that is <15% longer/shorter than another reads as "about the
  // same size" to a young child; 15% keeps the ordering visually obvious.
  // Mirrors src/game/sizeOrderRoundGenerator.js's own default exactly.
  var DEFAULT_MIN_RELATIVE_DIFFERENCE = 0.15;

  var ERRORS = Object.freeze({
    NO_VALID_COMBINATION: 'size_order_round_generation_failed',
  });

  var MODE_ID = 'ordenaPorTamano';

  // Mirrors src/data/creatureSheet.js's CREATURE_SHEETS lengthMeters field --
  // see the module doc comment above for why this is a local, static
  // duplicate instead of a `require` (same table public/scripts/classifyGame.js's
  // own DINOSAUR_DIETS mirrors).
  var DINOSAUR_LENGTHS = Object.freeze({
    trex: 12,
    triceratops: 9,
    velociraptor: 2,
    estegosaurio: 9,
    braquiosaurio: 21,
    ankylosaurus: 7,
    pteranodon: 1.8,
    spinosaurus: 15,
    dilophosaurus: 6.5,
    pachycephalosaurus: 4.5,
    compsognathus: 1,
    diplodocus: 25,
    iguanodon: 10,
    parasaurolophus: 10,
  });

  // Mirrors src/game/modesCatalog.js's MODES_CATALOG entry for
  // MODE_IDS.ORDENA_POR_TAMANO (minCreaturesWithField on "size", minCount 4).
  var SIZE_ORDER_MODE_MIN_CREATURES = 4;

  function isValidCreatureCount(creatureCount) {
    return (
      Number.isInteger(creatureCount) && creatureCount >= MIN_CREATURES_PER_ROUND && creatureCount <= MAX_CREATURES_PER_ROUND
    );
  }

  /** Every dinosaur id in the local DINOSAUR_LENGTHS mirror, as `{ id, lengthMeters }` entries -- mirrors src/game/sizeOrderRoundGenerator.js's own `getSizedCreatures` default pool. */
  function getSizedCreatures() {
    return Object.keys(DINOSAUR_LENGTHS).map(function (id) {
      return { id: id, lengthMeters: DINOSAUR_LENGTHS[id] };
    });
  }

  /** Resolves src/data/creatureSheet.js the require-or-null way, mirroring classifyGame.js's own resolveCreatureSheetModule. */
  function resolveCreatureSheetModule() {
    return typeof require === 'function' ? require('../../src/data/creatureSheet') : null;
  }

  /**
   * Whether Ordena por tamaño has enough verified creatures to unlock (PRD/
   * MODES_CATALOG requirement: >=4 creatures with a verified `lengthMeters`).
   * Prefers the real, verified `src/data/creatureSheet.js#isSizeOrderModeUnlocked`
   * under Node/Jest; falls back to counting the local `DINOSAUR_LENGTHS`
   * mirror above when `require` isn't available (real, unbundled browser),
   * mirroring classifyGame.js's own `isClassifyModeUnlocked`.
   */
  function isSizeOrderModeUnlocked() {
    var creatureSheetModule = resolveCreatureSheetModule();
    if (creatureSheetModule && typeof creatureSheetModule.isSizeOrderModeUnlocked === 'function') {
      return creatureSheetModule.isSizeOrderModeUnlocked();
    }
    return Object.keys(DINOSAUR_LENGTHS).length >= SIZE_ORDER_MODE_MIN_CREATURES;
  }

  /**
   * How far apart two lengths are, relative to the smaller one. Mirrors
   * src/game/sizeOrderRoundGenerator.js's own `relativeDifference` exactly.
   */
  function relativeDifference(a, b) {
    var smaller = Math.min(a, b);
    var larger = Math.max(a, b);
    if (smaller <= 0) {
      return Infinity;
    }
    return (larger - smaller) / smaller;
  }

  /** True when every consecutive pair of `ascendingLengths` clears `minRelativeDifference`. Mirrors src/game/sizeOrderRoundGenerator.js's own `hasUnambiguousGaps`. */
  function hasUnambiguousGaps(ascendingLengths, minRelativeDifference) {
    for (var i = 1; i < ascendingLengths.length; i += 1) {
      if (relativeDifference(ascendingLengths[i - 1], ascendingLengths[i]) < minRelativeDifference) {
        return false;
      }
    }
    return true;
  }

  /** Every `size`-element combination of `items`. Mirrors src/game/sizeOrderRoundGenerator.js's own `getCombinations`. */
  function getCombinations(items, size) {
    if (size <= 0 || size > items.length) {
      return [];
    }
    if (size === items.length) {
      return [items.slice()];
    }

    var combinations = [];
    function build(start, chosen) {
      if (chosen.length === size) {
        combinations.push(chosen.slice());
        return;
      }
      for (var i = start; i < items.length; i += 1) {
        chosen.push(items[i]);
        build(i + 1, chosen);
        chosen.pop();
      }
    }
    build(0, []);
    return combinations;
  }

  /**
   * Every combination of `options.creatureCount` sized creatures (defaults
   * to `getSizedCreatures()`) whose lengths, sorted ascending, clear
   * `options.minRelativeDifference` between every consecutive pair. Mirrors
   * src/game/sizeOrderRoundGenerator.js's own `getValidCombinations`.
   */
  function getValidCombinations(options) {
    options = options || {};
    var creatures = options.creatures || getSizedCreatures();
    var creatureCount = options.creatureCount;
    var minRelativeDifference =
      options.minRelativeDifference === undefined ? DEFAULT_MIN_RELATIVE_DIFFERENCE : options.minRelativeDifference;

    if (!isValidCreatureCount(creatureCount)) {
      throw new Error('creatureCount must be an integer between ' + MIN_CREATURES_PER_ROUND + ' and ' + MAX_CREATURES_PER_ROUND);
    }

    return getCombinations(creatures, creatureCount)
      .map(function (combination) {
        return combination.slice().sort(function (a, b) {
          return a.lengthMeters - b.lengthMeters;
        });
      })
      .filter(function (ascending) {
        return hasUnambiguousGaps(
          ascending.map(function (creature) {
            return creature.lengthMeters;
          }),
          minRelativeDifference
        );
      });
  }

  /**
   * Swaps two distinct, randomly-picked positions of `correctOrderIds`.
   * Mirrors src/game/sizeOrderRoundGenerator.js's own `buildInitialOrder`,
   * just taking `randomFn` directly instead of a seeded generator (see this
   * file's own doc comment on why).
   */
  function buildInitialOrder(correctOrderIds, randomFn) {
    var length = correctOrderIds.length;
    var firstIndex = Math.floor(randomFn() * length);
    var secondIndex = Math.floor(randomFn() * (length - 1));
    if (secondIndex >= firstIndex) {
      secondIndex += 1;
    }

    var initialOrder = correctOrderIds.slice();
    var swapped = initialOrder[firstIndex];
    initialOrder[firstIndex] = initialOrder[secondIndex];
    initialOrder[secondIndex] = swapped;

    return initialOrder;
  }

  /**
   * Generates one Ordena por tamaño round. Mirrors
   * src/game/sizeOrderRoundGenerator.js's own `generateSizeOrderRound`
   * exactly (same return/error shape), except randomness comes from
   * `options.randomFn` (defaulting to `Math.random`) instead of a seed.
   */
  function generateSizeOrderRound(options) {
    options = options || {};
    var randomFn = options.randomFn || Math.random;
    var minRelativeDifference =
      options.minRelativeDifference === undefined ? DEFAULT_MIN_RELATIVE_DIFFERENCE : options.minRelativeDifference;

    var creatureCount = options.creatureCount;
    if (creatureCount === undefined) {
      var span = MAX_CREATURES_PER_ROUND - MIN_CREATURES_PER_ROUND + 1;
      creatureCount = MIN_CREATURES_PER_ROUND + Math.floor(randomFn() * span);
    } else if (!isValidCreatureCount(creatureCount)) {
      throw new Error('creatureCount must be an integer between ' + MIN_CREATURES_PER_ROUND + ' and ' + MAX_CREATURES_PER_ROUND);
    }

    var combinations = getValidCombinations({
      creatures: options.creatures,
      creatureCount: creatureCount,
      minRelativeDifference: minRelativeDifference,
    });
    if (combinations.length === 0) {
      return { error: ERRORS.NO_VALID_COMBINATION, creatureCount: creatureCount, minRelativeDifference: minRelativeDifference };
    }

    var chosen = combinations[Math.floor(randomFn() * combinations.length)];
    var correctOrder = chosen.map(function (creature) {
      return creature.id;
    });
    var initialOrder = buildInitialOrder(correctOrder, randomFn);

    return {
      creatureCount: creatureCount,
      minRelativeDifference: minRelativeDifference,
      creatures: chosen.map(function (creature) {
        return { id: creature.id, lengthMeters: creature.lengthMeters };
      }),
      correctOrder: correctOrder,
      initialOrder: initialOrder,
    };
  }

  /**
   * Builds the per-game context `generateSizeOrderRoundForContract` reads on
   * every call -- mirrors oidoJurasicoScreen.js's own
   * `buildOidoJurasicoRoundContext`. `options.creatures`/`options.creatureCount`
   * override the default pool/count (tests only -- production always draws
   * from the full shipped `DINOSAUR_LENGTHS` roster with a random 3-4 count
   * per round).
   */
  function buildSizeOrderRoundContext(options) {
    options = options || {};
    return {
      randomFn: options.randomFn || Math.random,
      creatures: options.creatures,
      creatureCount: options.creatureCount,
      minRelativeDifference: options.minRelativeDifference,
    };
  }

  /**
   * Generates round `roundIndex` (0-based) of an Ordena por tamaño game.
   * Matches roundContract.js's `generateRound(roundIndex, context)` signature
   * (see file doc comment) -- `src/game/roundContract.js`'s own `buildRound`
   * sets `roundIndex`/`answered` on whatever this returns, so neither is set
   * here.
   */
  function generateSizeOrderRoundForContract(roundIndex, context) {
    context = context || {};
    return generateSizeOrderRound({
      randomFn: context.randomFn,
      creatures: context.creatures,
      creatureCount: context.creatureCount,
      minRelativeDifference: context.minRelativeDifference,
    });
  }

  var api = {
    MODE_ID: MODE_ID,
    MIN_CREATURES_PER_ROUND: MIN_CREATURES_PER_ROUND,
    MAX_CREATURES_PER_ROUND: MAX_CREATURES_PER_ROUND,
    DEFAULT_MIN_RELATIVE_DIFFERENCE: DEFAULT_MIN_RELATIVE_DIFFERENCE,
    ERRORS: ERRORS,
    DINOSAUR_LENGTHS: DINOSAUR_LENGTHS,
    SIZE_ORDER_MODE_MIN_CREATURES: SIZE_ORDER_MODE_MIN_CREATURES,
    isSizeOrderModeUnlocked: isSizeOrderModeUnlocked,
    getSizedCreatures: getSizedCreatures,
    relativeDifference: relativeDifference,
    hasUnambiguousGaps: hasUnambiguousGaps,
    getCombinations: getCombinations,
    getValidCombinations: getValidCombinations,
    buildInitialOrder: buildInitialOrder,
    generateSizeOrderRound: generateSizeOrderRound,
    buildSizeOrderRoundContext: buildSizeOrderRoundContext,
    generateSizeOrderRoundForContract: generateSizeOrderRoundForContract,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.game = window.DinoQuiz.game || {};
    window.DinoQuiz.game.sizeOrder = api;
  }
})();
