'use strict';

/**
 * Round generation for the Adivina la sombra game mode (TRIOFSND-262).
 *
 * `generateShadowRound`/`generateShadowRounds` build the 10 rounds of a game
 * purely from data -- no DOM, no rendering -- so the app shell (still to
 * come) only has to draw whatever this returns. Each round is "guess which
 * creature casts this silhouette": one correct creature plus
 * DISTRACTORS_PER_ROUND (3) decoys, shown as OPTIONS_PER_ROUND (4) shuffled
 * choices.
 *
 * Every creature this module ever draws from is `src/data/creatureSheet.js`'s
 * `shadowMeta.approved` pool (`getApprovedShadowCreatures`) -- the single
 * verified source for which silhouettes are legible and unambiguous. Two
 * independent guards keep a round fair:
 *   1. Catalog gate: if fewer than `SHADOW_MODE_MIN_APPROVED` (12) creatures
 *      are approved, no round is built at all -- generation returns a local,
 *      machine-readable error (`ERRORS.CATALOG_TOO_SMALL`) instead of a
 *      partial/degraded round. Mirrors sizeOrderRoundGenerator.js's own
 *      "return a local error code, never guess" contract.
 *   2. Indistinguishable pairs: `creatureSheet.js`'s
 *      `SHADOW_INDISTINGUISHABLE_PAIRS` catalogs specific approved pairs
 *      whose outlines are too close to tell apart. No two of a round's 4
 *      options (target included) are ever such a pair -- otherwise a
 *      "correct" answer would be unverifiable (PRD: no false/ambiguous
 *      feedback to the child).
 *
 * Transforms (mirroring/rotating the silhouette, for round-to-round variety)
 * are unlocked gradually by level, mirroring parejasGame.js's
 * `difficultyBiasForLevel` pattern of level-gated presentation:
 *   - below `LEVEL_UNLOCKS_FLIP`: no transform at all (identity only) --
 *     early rounds show every silhouette in its plain, upright pose.
 *   - `LEVEL_UNLOCKS_FLIP` to `LEVEL_UNLOCKS_ADVANCED_TRANSFORMS - 1`: only
 *     `FLIP_HORIZONTAL` may be applied -- the one transform every approved
 *     creature tolerates (`creatureSheet.js`'s `GROUND_TRANSFORMS`).
 *   - `LEVEL_UNLOCKS_ADVANCED_TRANSFORMS` and above: the target's own
 *     `shadowMeta.allowedTransforms` apply in full (e.g. the flyer's
 *     rotations) -- never a transform the creature sheet didn't explicitly
 *     grant, so a rotated/mirrored silhouette never becomes unrecognizable.
 * A transform only ever changes how a silhouette is *drawn*; it never
 * touches `round.correctId` -- the answer's identity is invariant under any
 * transform in this module.
 *
 * A transform that is allowed by `shadowMeta` can still be geometrically
 * unsafe: rotating a silhouette 90 degrees swaps its bounding box, which can
 * push a wide creature (e.g. the flyer's wingspan) taller than the visible
 * stage. `GAME_AREA`/`SILHOUETTE_BOX_BY_VISUAL_FAMILY`/`fitsWithinGameArea`
 * model that check in the abstract (normalized units, not real pixels --
 * there is no rendering layer yet to measure): `GAME_AREA` is wider than it
 * is tall because the header, round progress and the four answer buttons
 * already claim most of a 375px-wide screen's vertical space (PRD: no
 * horizontal scroll at 375px), leaving the silhouette's own slot shorter
 * than it is wide. `validTransformOptions` only ever offers a transform that
 * clears both guards -- shadowMeta AND geometry -- falling back to identity
 * (which itself must fit) when nothing else does; if not even identity fits,
 * that creature cannot be safely rendered this round and generation reports
 * `ERRORS.SILHOUETTE_OUT_OF_BOUNDS` instead of guessing.
 */

const gameFlow = require('./gameFlow');
const {
  SHADOW_TRANSFORMS,
  SHADOW_INDISTINGUISHABLE_PAIRS,
  SHADOW_MODE_MIN_APPROVED,
  VISUAL_FAMILIES,
  getCreatureSheet,
  getApprovedShadowCreatures,
} = require('../data/creatureSheet');

const ROUNDS_PER_GAME = 10;
const OPTIONS_PER_ROUND = 4;
const DISTRACTORS_PER_ROUND = OPTIONS_PER_ROUND - 1;

// Identity: no transform applied. Included alongside SHADOW_TRANSFORMS'
// values in every level's/creature's candidate pool -- always the fallback.
const TRANSFORM_NONE = null;

// Below this level every round is shown upright/unmirrored; from it, only
// FLIP_HORIZONTAL (safe for any approved creature) may be picked.
const LEVEL_UNLOCKS_FLIP = 4;
// From this level on, a creature's full shadowMeta.allowedTransforms (e.g.
// the flyer's rotations) become candidates, still gated by geometry.
const LEVEL_UNLOCKS_ADVANCED_TRANSFORMS = 7;

// Normalized silhouette stage: see the file header for why it is wider than
// it is tall. Units are arbitrary/self-consistent (no real renderer yet to
// measure against) -- only relative comparisons against
// SILHOUETTE_BOX_BY_VISUAL_FAMILY matter.
const GAME_AREA = Object.freeze({ width: 320, height: 240 });

// Each approved creature's natural (untransformed) bounding box, by the
// broad body-plan category creatureSheet.js already classifies it under
// (`visualFamily`) -- reused rather than re-deriving a second per-creature
// shape taxonomy. Every box fits GAME_AREA upright by construction; only the
// flyer's wide/short box overflows GAME_AREA's height once ROTATE_90 swaps
// its dimensions, which is exactly the case `fitsWithinGameArea` exists to
// catch.
const SILHOUETTE_BOX_BY_VISUAL_FAMILY = Object.freeze({
  [VISUAL_FAMILIES.BIPED_CARNIVORE]: Object.freeze({ width: 140, height: 220 }),
  [VISUAL_FAMILIES.BIPED_HERBIVORE]: Object.freeze({ width: 160, height: 210 }),
  [VISUAL_FAMILIES.ARMORED_QUADRUPED]: Object.freeze({ width: 260, height: 140 }),
  [VISUAL_FAMILIES.LONG_NECK_QUADRUPED]: Object.freeze({ width: 300, height: 200 }),
  [VISUAL_FAMILIES.FLYING_REPTILE]: Object.freeze({ width: 300, height: 110 }),
});

const ERRORS = Object.freeze({
  CATALOG_TOO_SMALL: 'shadow_round_catalog_too_small',
  NOT_ENOUGH_DISTRACTORS: 'shadow_round_not_enough_distractors',
  SILHOUETTE_OUT_OF_BOUNDS: 'shadow_round_silhouette_out_of_bounds',
});

/** The creature's natural (untransformed) silhouette box, or `null` when its sheet/visualFamily is unknown -- never guessed. */
function getSilhouetteBox(dinosaurId, options) {
  options = options || {};
  const lookup = options.getCreatureSheet || getCreatureSheet;
  const sheet = lookup(dinosaurId);
  const box = sheet && SILHOUETTE_BOX_BY_VISUAL_FAMILY[sheet.visualFamily];
  return box ? { width: box.width, height: box.height } : null;
}

/**
 * `box` after `transform`: ROTATE_90 swaps width/height (a quarter turn
 * rotates the bounding box itself); FLIP_HORIZONTAL, ROTATE_180 and identity
 * (TRANSFORM_NONE) all preserve the box's dimensions -- a mirror or a
 * half-turn never changes how much space a silhouette occupies.
 */
function applyTransformToBox(box, transform) {
  if (transform === SHADOW_TRANSFORMS.ROTATE_90) {
    return { width: box.height, height: box.width };
  }
  return { width: box.width, height: box.height };
}

/** Whether `box` fits inside `gameArea` (defaults to GAME_AREA) on both axes. */
function fitsWithinGameArea(box, gameArea) {
  const area = gameArea || GAME_AREA;
  return box.width <= area.width && box.height <= area.height;
}

/**
 * The transforms a `level` unlocks, filtered to what `creatureAllowedTransforms`
 * (the target's own shadowMeta.allowedTransforms) actually grants -- never a
 * transform the creature sheet didn't explicitly allow. Below
 * `LEVEL_UNLOCKS_FLIP` this is always empty (identity only, added by the
 * caller); TRANSFORM_NONE is never included here since it isn't a member of
 * SHADOW_TRANSFORMS.
 */
function transformsUnlockedByLevel(level, creatureAllowedTransforms) {
  if (!Number.isInteger(level) || level < LEVEL_UNLOCKS_FLIP) {
    return [];
  }
  if (level < LEVEL_UNLOCKS_ADVANCED_TRANSFORMS) {
    return creatureAllowedTransforms.filter((transform) => transform === SHADOW_TRANSFORMS.FLIP_HORIZONTAL);
  }
  return creatureAllowedTransforms.slice();
}

/**
 * Every transform (identity plus whatever `transformsUnlockedByLevel` grants
 * for `dinosaurId` at `level`) that also clears `fitsWithinGameArea` --
 * i.e. every transform this module could safely pick for this round. Empty
 * only when even identity doesn't fit (missing/invalid silhouette data);
 * `generateShadowRound` treats that as `ERRORS.SILHOUETTE_OUT_OF_BOUNDS`.
 */
function validTransformOptions(dinosaurId, level, options) {
  options = options || {};
  const lookup = options.getCreatureSheet || getCreatureSheet;
  const sheet = lookup(dinosaurId);
  const box = getSilhouetteBox(dinosaurId, options);

  if (!sheet || !box) {
    return [];
  }

  const gameArea = options.gameArea || GAME_AREA;
  const candidates = [TRANSFORM_NONE].concat(
    transformsUnlockedByLevel(level, sheet.shadowMeta.allowedTransforms || [])
  );

  return candidates.filter((transform) => fitsWithinGameArea(applyTransformToBox(box, transform), gameArea));
}

/** Whether `idA`/`idB` are cataloged as indistinguishable (order-independent), per `pairs` (defaults to SHADOW_INDISTINGUISHABLE_PAIRS). */
function areIndistinguishable(idA, idB, pairs) {
  const list = pairs || SHADOW_INDISTINGUISHABLE_PAIRS;
  return list.some(([a, b]) => (a === idA && b === idB) || (a === idB && b === idA));
}

/** Whether `candidateId` is indistinguishable from none of `chosenIds` -- the "compatible per shadowMeta" test a distractor must clear. */
function isCompatibleDistractor(candidateId, chosenIds, pairs) {
  return chosenIds.every((chosenId) => !areIndistinguishable(candidateId, chosenId, pairs));
}

/**
 * Picks `count` creatures from `pool`, distinct from `targetId` and never
 * indistinguishable (per `pairs`) from `targetId` or from each other --
 * every option in the final round is uniquely identifiable from every other.
 * Returns fewer than `count` if the (shuffled) pool runs out of compatible
 * candidates; the caller decides whether that's an error.
 */
function pickDistractors(targetId, pool, count, randomFn, pairs) {
  const shuffled = gameFlow.shuffle(
    pool.filter((id) => id !== targetId),
    randomFn
  );
  const chosen = [targetId];
  const distractors = [];

  shuffled.forEach((candidateId) => {
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

/** Picks the round's correct creature: uniform random from `pool`, excluding `previousDinosaurId` when the pool has another option -- never the same target two rounds in a row. */
function pickTarget(previousDinosaurId, pool, randomFn) {
  const candidates = pool.length > 1 ? pool.filter((id) => id !== previousDinosaurId) : pool;
  const index = Math.floor(randomFn() * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)];
}

/**
 * Generates round `roundIndex` (0-based, < ROUNDS_PER_GAME) of an Adivina la
 * sombra game at `level` (1-10, gameFlow.js's shared level range).
 *
 * First checks the catalog gate (`SHADOW_MODE_MIN_APPROVED`); if it fails,
 * no round is built and `{ error: ERRORS.CATALOG_TOO_SMALL, details }` is
 * returned. Otherwise picks the target (never a repeat of
 * `options.previousDinosaurId`), resolves a geometry-and-shadowMeta-safe
 * transform (`validTransformOptions`; `{ error:
 * ERRORS.SILHOUETTE_OUT_OF_BOUNDS }` if none exists), and picks
 * DISTRACTORS_PER_ROUND compatible decoys (`{ error:
 * ERRORS.NOT_ENOUGH_DISTRACTORS }` if the catalog can't supply enough).
 *
 * Returns `{ roundIndex, level, correctId, options, transform, status:
 * 'playing' }` on success -- `options` is the shuffled 4-id choice list
 * (target included), so no positional bias ever reveals the answer.
 */
function generateShadowRound(options) {
  options = options || {};
  const { roundIndex, level } = options;

  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= ROUNDS_PER_GAME) {
    throw new Error(`roundIndex must be an integer between 0 and ${ROUNDS_PER_GAME - 1}`);
  }
  if (!gameFlow.isValidLevel(level)) {
    throw new Error(`level must be an integer between ${gameFlow.MIN_LEVEL} and ${gameFlow.MAX_LEVEL}`);
  }

  const randomFn = options.randomFn || Math.random;
  const getSheet = options.getCreatureSheet || getCreatureSheet;

  const approved = getApprovedShadowCreatures(options.sheets);
  if (approved.length < SHADOW_MODE_MIN_APPROVED) {
    return {
      error: ERRORS.CATALOG_TOO_SMALL,
      details: { need: SHADOW_MODE_MIN_APPROVED, have: approved.length },
    };
  }

  const target = pickTarget(options.previousDinosaurId, approved, randomFn);

  const transformOptions = validTransformOptions(target, level, {
    getCreatureSheet: getSheet,
    gameArea: options.gameArea,
  });
  if (transformOptions.length === 0) {
    return { error: ERRORS.SILHOUETTE_OUT_OF_BOUNDS, details: { dinosaurId: target } };
  }
  const transformIndex = Math.min(
    Math.floor(randomFn() * transformOptions.length),
    transformOptions.length - 1
  );
  const transform = transformOptions[transformIndex];

  const distractors = pickDistractors(
    target,
    approved,
    DISTRACTORS_PER_ROUND,
    randomFn,
    options.indistinguishablePairs
  );
  if (distractors.length < DISTRACTORS_PER_ROUND) {
    return {
      error: ERRORS.NOT_ENOUGH_DISTRACTORS,
      details: { dinosaurId: target, need: DISTRACTORS_PER_ROUND, have: distractors.length },
    };
  }

  const shuffledOptions = gameFlow.shuffle([target].concat(distractors), randomFn);

  return {
    roundIndex,
    level,
    correctId: target,
    options: shuffledOptions,
    transform,
    status: 'playing',
  };
}

/**
 * Generates all ROUNDS_PER_GAME (10) rounds of one Adivina la sombra game at
 * `options.level`, threading each round's `correctId` into the next as
 * `previousDinosaurId` (mirrors classifyGame.js's `pickDinosaur` no-repeat
 * rule). Stops and returns the first round's error verbatim (catalog/geometry
 * problems apply to every round the same way, so there is nothing to gain by
 * generating partial rounds); otherwise returns `{ rounds }`, an array of
 * exactly ROUNDS_PER_GAME round objects.
 */
function generateShadowRounds(options) {
  options = options || {};
  const rounds = [];
  let previousDinosaurId = options.previousDinosaurId;

  for (let roundIndex = 0; roundIndex < ROUNDS_PER_GAME; roundIndex += 1) {
    const round = generateShadowRound({
      roundIndex,
      level: options.level,
      randomFn: options.randomFn,
      sheets: options.sheets,
      gameArea: options.gameArea,
      getCreatureSheet: options.getCreatureSheet,
      indistinguishablePairs: options.indistinguishablePairs,
      previousDinosaurId,
    });

    if (round.error) {
      return { error: round.error, details: round.details };
    }

    rounds.push(round);
    previousDinosaurId = round.correctId;
  }

  return { rounds };
}

module.exports = {
  ROUNDS_PER_GAME,
  OPTIONS_PER_ROUND,
  DISTRACTORS_PER_ROUND,
  LEVEL_UNLOCKS_FLIP,
  LEVEL_UNLOCKS_ADVANCED_TRANSFORMS,
  GAME_AREA,
  SILHOUETTE_BOX_BY_VISUAL_FAMILY,
  ERRORS,
  getSilhouetteBox,
  applyTransformToBox,
  fitsWithinGameArea,
  transformsUnlockedByLevel,
  validTransformOptions,
  areIndistinguishable,
  isCompatibleDistractor,
  pickDistractors,
  pickTarget,
  generateShadowRound,
  generateShadowRounds,
};
