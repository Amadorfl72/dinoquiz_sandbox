'use strict';

/**
 * Round generation for the Ordena por tamaño game mode (TRIOFSND-285).
 *
 * `generateSizeOrderRound` picks 3-4 creatures from the verified creature
 * sheets (src/data/creatureSheet.js's `CREATURE_SHEETS`, the only pool this
 * module ever draws from), requiring every pair of consecutive lengths --
 * once sorted ascending -- to differ by at least a configurable relative gap
 * (`minRelativeDifference`, default 15%). That guards against a round where
 * two creatures are so close in length a 6-8 year old (PRD target audience)
 * could reasonably see either order as correct.
 *
 * The initial (shown-to-the-player) order is never the already-solved
 * order: it is built by swapping exactly two positions of the correct
 * (ascending-by-length) order, so exactly two creatures are out of place and
 * swapping those same two back is the only fix -- no other pair of
 * positions, swapped, would also produce the correct order. That is what
 * guarantees the round is unambiguous: there is exactly one swap that
 * solves it.
 *
 * `generateSizeOrderRound` is deterministic for a given `seed`, reusing
 * mazeGenerator.js's seeded PRNG (`hashSeed`/`createRandom`) instead of
 * re-implementing one -- both modules are `src/game/` siblings and neither
 * function is maze-specific.
 *
 * If no combination of the requested creature count clears
 * `minRelativeDifference`, no round is built: this returns a local failure
 * code (`ERRORS.NO_VALID_COMBINATION`) instead. Persisting/logging that
 * failure is left to the caller -- this module never does it itself.
 */

const { CREATURE_SHEETS } = require('../data/creatureSheet');
const { hashSeed, createRandom } = require('./mazeGenerator');

const MIN_CREATURES_PER_ROUND = 3;
const MAX_CREATURES_PER_ROUND = 4;

// A creature that is <15% longer/shorter than another reads as "about the
// same size" to a young child; 15% keeps the ordering visually obvious.
const DEFAULT_MIN_RELATIVE_DIFFERENCE = 0.15;

const ERRORS = Object.freeze({
  NO_VALID_COMBINATION: 'size_order_round_generation_failed',
});

function isValidCreatureCount(creatureCount) {
  return (
    Number.isInteger(creatureCount) &&
    creatureCount >= MIN_CREATURES_PER_ROUND &&
    creatureCount <= MAX_CREATURES_PER_ROUND
  );
}

/**
 * Every creature sheet that carries a verified, positive `lengthMeters` --
 * the pool `generateSizeOrderRound` draws from by default -- as plain
 * `{ id, lengthMeters }` entries.
 */
function getSizedCreatures(sheets) {
  return Object.values(sheets || CREATURE_SHEETS)
    .filter(
      (sheet) =>
        sheet && typeof sheet.lengthMeters === 'number' && Number.isFinite(sheet.lengthMeters) && sheet.lengthMeters > 0
    )
    .map((sheet) => ({ id: sheet.id, lengthMeters: sheet.lengthMeters }));
}

/**
 * How far apart two lengths are, relative to the smaller one -- e.g. 9 and
 * 10.5 are `(10.5 - 9) / 9` ~= 0.1667 (~17%) apart. Symmetric in `a`/`b`.
 */
function relativeDifference(a, b) {
  const smaller = Math.min(a, b);
  const larger = Math.max(a, b);
  if (smaller <= 0) {
    return Infinity;
  }
  return (larger - smaller) / smaller;
}

/**
 * True when every consecutive pair of `ascendingLengths` clears
 * `minRelativeDifference`. Checking only consecutive pairs is sufficient to
 * guarantee it for every pair: non-consecutive gaps in a sorted list are
 * only ever larger.
 */
function hasUnambiguousGaps(ascendingLengths, minRelativeDifference) {
  for (let i = 1; i < ascendingLengths.length; i += 1) {
    if (relativeDifference(ascendingLengths[i - 1], ascendingLengths[i]) < minRelativeDifference) {
      return false;
    }
  }
  return true;
}

/** Every `size`-element combination of `items`, as arrays preserving `items`' relative order. */
function getCombinations(items, size) {
  if (size <= 0 || size > items.length) {
    return [];
  }
  if (size === items.length) {
    return [items.slice()];
  }

  const combinations = [];
  function build(start, chosen) {
    if (chosen.length === size) {
      combinations.push(chosen.slice());
      return;
    }
    for (let i = start; i < items.length; i += 1) {
      chosen.push(items[i]);
      build(i + 1, chosen);
      chosen.pop();
    }
  }
  build(0, []);
  return combinations;
}

/**
 * Every combination of `options.creatureCount` sized creatures (defaults to
 * `getSizedCreatures()`) whose lengths, sorted ascending, clear
 * `options.minRelativeDifference` between every consecutive pair -- i.e.
 * every combination `generateSizeOrderRound` could validly build a round
 * from, each returned already sorted ascending by length. Exported so tests
 * can exhaustively check every generatable round instead of sampling a few.
 */
function getValidCombinations(options) {
  options = options || {};
  const creatures = options.creatures || getSizedCreatures();
  const creatureCount = options.creatureCount;
  const minRelativeDifference =
    options.minRelativeDifference === undefined ? DEFAULT_MIN_RELATIVE_DIFFERENCE : options.minRelativeDifference;

  if (!isValidCreatureCount(creatureCount)) {
    throw new Error(
      `creatureCount must be an integer between ${MIN_CREATURES_PER_ROUND} and ${MAX_CREATURES_PER_ROUND}`
    );
  }

  return getCombinations(creatures, creatureCount)
    .map((combination) => combination.slice().sort((a, b) => a.lengthMeters - b.lengthMeters))
    .filter((ascending) => hasUnambiguousGaps(ascending.map((creature) => creature.lengthMeters), minRelativeDifference));
}

/**
 * Every index where `a` and `b` differ (same length arrays assumed).
 * Exported for tests verifying exactly two positions differ between an
 * initial and a correct order.
 */
function getMismatchedIndices(a, b) {
  const indices = [];
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * Swaps two distinct, randomly-picked positions of `correctOrderIds`. The
 * result is never already solved (a combination's lengths -- and so ids --
 * are all distinct, so any two distinct positions hold different creatures)
 * and is fixable by swapping back exactly those two positions: no other
 * pair, swapped, would also reach the correct order, since only those two
 * positions differ from it at all.
 */
function buildInitialOrder(correctOrderIds, random) {
  const length = correctOrderIds.length;
  const firstIndex = Math.floor(random() * length);
  let secondIndex = Math.floor(random() * (length - 1));
  if (secondIndex >= firstIndex) {
    secondIndex += 1;
  }

  const initialOrder = correctOrderIds.slice();
  const swapped = initialOrder[firstIndex];
  initialOrder[firstIndex] = initialOrder[secondIndex];
  initialOrder[secondIndex] = swapped;

  return initialOrder;
}

/**
 * Generates one Ordena por tamaño round.
 *
 * `options.creatureCount` (3 or 4, chosen at random via `options.seed` when
 * omitted) creatures are drawn from `options.creatures` (defaults to every
 * verified `CREATURE_SHEETS` entry with a `lengthMeters`), requiring every
 * pair of consecutive lengths in the correct order to clear
 * `options.minRelativeDifference` (default 15%).
 *
 * Returns `{ creatureCount, minRelativeDifference, creatures, correctOrder,
 * initialOrder }`, where `creatures` carries every selected creature's real
 * `lengthMeters` (for a later evaluation step to score against) and
 * `initialOrder` is exactly one two-element swap away from `correctOrder`.
 *
 * If no combination of `creatureCount` creatures clears the minimum
 * difference, returns `{ error: 'size_order_round_generation_failed',
 * creatureCount, minRelativeDifference }` instead -- no round is built, and
 * this function never persists/logs that failure itself.
 */
function generateSizeOrderRound(options) {
  options = options || {};
  const random = createRandom(options.seed);
  const minRelativeDifference =
    options.minRelativeDifference === undefined ? DEFAULT_MIN_RELATIVE_DIFFERENCE : options.minRelativeDifference;

  let creatureCount = options.creatureCount;
  if (creatureCount === undefined) {
    const span = MAX_CREATURES_PER_ROUND - MIN_CREATURES_PER_ROUND + 1;
    creatureCount = MIN_CREATURES_PER_ROUND + Math.floor(random() * span);
  } else if (!isValidCreatureCount(creatureCount)) {
    throw new Error(
      `creatureCount must be an integer between ${MIN_CREATURES_PER_ROUND} and ${MAX_CREATURES_PER_ROUND}`
    );
  }

  const combinations = getValidCombinations({
    creatures: options.creatures,
    creatureCount,
    minRelativeDifference,
  });
  if (combinations.length === 0) {
    return { error: ERRORS.NO_VALID_COMBINATION, creatureCount, minRelativeDifference };
  }

  const chosen = combinations[Math.floor(random() * combinations.length)];
  const correctOrder = chosen.map((creature) => creature.id);
  const initialOrder = buildInitialOrder(correctOrder, random);

  return {
    creatureCount,
    minRelativeDifference,
    creatures: chosen.map((creature) => ({ id: creature.id, lengthMeters: creature.lengthMeters })),
    correctOrder,
    initialOrder,
  };
}

module.exports = {
  MIN_CREATURES_PER_ROUND,
  MAX_CREATURES_PER_ROUND,
  DEFAULT_MIN_RELATIVE_DIFFERENCE,
  ERRORS,
  isValidCreatureCount,
  getSizedCreatures,
  relativeDifference,
  hasUnambiguousGaps,
  getCombinations,
  getValidCombinations,
  getMismatchedIndices,
  buildInitialOrder,
  generateSizeOrderRound,
};
