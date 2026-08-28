'use strict';

const {
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
} = require('./shadowGuessRound');
const {
  SHADOW_TRANSFORMS,
  SHADOW_INDISTINGUISHABLE_PAIRS,
  SHADOW_MODE_MIN_APPROVED,
  CREATURE_SHEETS,
  getApprovedShadowCreatures,
} = require('../data/creatureSheet');
const { DINOSAURS } = require('../data/questionBank');
const { createRandom } = require('./mazeGenerator');

const APPROVED = getApprovedShadowCreatures();

describe('creature catalog fixture sanity', () => {
  test('the real catalog has at least SHADOW_MODE_MIN_APPROVED approved creatures', () => {
    expect(APPROVED.length).toBeGreaterThanOrEqual(SHADOW_MODE_MIN_APPROVED);
  });
});

describe('getSilhouetteBox', () => {
  test('returns a box for every approved creature (every visualFamily is covered)', () => {
    APPROVED.forEach((id) => {
      expect(getSilhouetteBox(id)).toEqual(expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }));
    });
  });

  test('returns null for an unknown dinosaur id', () => {
    expect(getSilhouetteBox('not-a-real-dinosaur')).toBeNull();
  });

  test('every family box fits GAME_AREA upright by construction', () => {
    Object.values(SILHOUETTE_BOX_BY_VISUAL_FAMILY).forEach((box) => {
      expect(fitsWithinGameArea(box)).toBe(true);
    });
  });
});

describe('applyTransformToBox', () => {
  const box = { width: 100, height: 50 };

  test('ROTATE_90 swaps width and height', () => {
    expect(applyTransformToBox(box, SHADOW_TRANSFORMS.ROTATE_90)).toEqual({ width: 50, height: 100 });
  });

  test('FLIP_HORIZONTAL, ROTATE_180 and identity (null) preserve dimensions', () => {
    expect(applyTransformToBox(box, SHADOW_TRANSFORMS.FLIP_HORIZONTAL)).toEqual(box);
    expect(applyTransformToBox(box, SHADOW_TRANSFORMS.ROTATE_180)).toEqual(box);
    expect(applyTransformToBox(box, null)).toEqual(box);
  });
});

describe('fitsWithinGameArea', () => {
  test('true when both dimensions are within the area', () => {
    expect(fitsWithinGameArea({ width: 100, height: 100 }, { width: 200, height: 200 })).toBe(true);
  });

  test('false as soon as one dimension exceeds the area', () => {
    expect(fitsWithinGameArea({ width: 201, height: 100 }, { width: 200, height: 200 })).toBe(false);
    expect(fitsWithinGameArea({ width: 100, height: 201 }, { width: 200, height: 200 })).toBe(false);
  });

  test('defaults to the real GAME_AREA when none is passed', () => {
    expect(fitsWithinGameArea({ width: GAME_AREA.width + 1, height: 10 })).toBe(false);
  });
});

describe('transformsUnlockedByLevel', () => {
  const allowed = [SHADOW_TRANSFORMS.FLIP_HORIZONTAL, SHADOW_TRANSFORMS.ROTATE_90, SHADOW_TRANSFORMS.ROTATE_180];

  test('below LEVEL_UNLOCKS_FLIP, nothing is unlocked', () => {
    for (let level = 1; level < LEVEL_UNLOCKS_FLIP; level += 1) {
      expect(transformsUnlockedByLevel(level, allowed)).toEqual([]);
    }
  });

  test('from LEVEL_UNLOCKS_FLIP up to (not including) LEVEL_UNLOCKS_ADVANCED_TRANSFORMS, only FLIP_HORIZONTAL', () => {
    for (let level = LEVEL_UNLOCKS_FLIP; level < LEVEL_UNLOCKS_ADVANCED_TRANSFORMS; level += 1) {
      expect(transformsUnlockedByLevel(level, allowed)).toEqual([SHADOW_TRANSFORMS.FLIP_HORIZONTAL]);
    }
  });

  test('from LEVEL_UNLOCKS_ADVANCED_TRANSFORMS on, every creature-allowed transform', () => {
    expect(transformsUnlockedByLevel(LEVEL_UNLOCKS_ADVANCED_TRANSFORMS, allowed)).toEqual(allowed);
    expect(transformsUnlockedByLevel(10, allowed)).toEqual(allowed);
  });

  test('never grants a transform the creature does not allow, at any level', () => {
    expect(transformsUnlockedByLevel(10, [SHADOW_TRANSFORMS.FLIP_HORIZONTAL])).toEqual([SHADOW_TRANSFORMS.FLIP_HORIZONTAL]);
  });
});

describe('validTransformOptions', () => {
  test('below LEVEL_UNLOCKS_FLIP, only identity (null) is offered, for any approved creature', () => {
    APPROVED.forEach((id) => {
      expect(validTransformOptions(id, 1)).toEqual([null]);
    });
  });

  test('a grounded (non-flyer) creature only ever offers identity and FLIP_HORIZONTAL, never a rotation', () => {
    const options = validTransformOptions(DINOSAURS.TREX, 10);
    expect(options).toEqual(expect.arrayContaining([null, SHADOW_TRANSFORMS.FLIP_HORIZONTAL]));
    expect(options).not.toContain(SHADOW_TRANSFORMS.ROTATE_90);
    expect(options).not.toContain(SHADOW_TRANSFORMS.ROTATE_180);
  });

  test('the flyer is geometrically rejected for ROTATE_90 (wingspan would exceed GAME_AREA height) but keeps ROTATE_180/FLIP/identity', () => {
    const options = validTransformOptions(DINOSAURS.PTERANODON, LEVEL_UNLOCKS_ADVANCED_TRANSFORMS);
    expect(options).not.toContain(SHADOW_TRANSFORMS.ROTATE_90);
    expect(options).toEqual(
      expect.arrayContaining([null, SHADOW_TRANSFORMS.FLIP_HORIZONTAL, SHADOW_TRANSFORMS.ROTATE_180])
    );
  });

  test('empty for an unknown creature (no sheet/box to validate against)', () => {
    expect(validTransformOptions('not-a-real-dinosaur', 10)).toEqual([]);
  });

  test('empty when even identity does not fit an artificially tiny game area', () => {
    const options = validTransformOptions(DINOSAURS.TREX, 1, { gameArea: { width: 1, height: 1 } });
    expect(options).toEqual([]);
  });
});

describe('areIndistinguishable / isCompatibleDistractor', () => {
  test('true (order-independent) for a cataloged pair', () => {
    const [a, b] = SHADOW_INDISTINGUISHABLE_PAIRS[0];
    expect(areIndistinguishable(a, b)).toBe(true);
    expect(areIndistinguishable(b, a)).toBe(true);
  });

  test('false for two creatures never cataloged together', () => {
    expect(areIndistinguishable(DINOSAURS.TREX, DINOSAURS.TRICERATOPS)).toBe(false);
  });

  test('isCompatibleDistractor rejects a candidate indistinguishable from any already-chosen id', () => {
    const [a, b] = SHADOW_INDISTINGUISHABLE_PAIRS[0];
    expect(isCompatibleDistractor(b, [a])).toBe(false);
    expect(isCompatibleDistractor(DINOSAURS.TREX, [a])).toBe(true);
  });
});

describe('pickDistractors', () => {
  test('never includes the target and never an indistinguishable pair with the target or with another chosen distractor', () => {
    const random = createRandom('distractors');
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const target = APPROVED[attempt % APPROVED.length];
      const distractors = pickDistractors(target, APPROVED, DISTRACTORS_PER_ROUND, random);
      expect(distractors).toHaveLength(DISTRACTORS_PER_ROUND);
      expect(distractors).not.toContain(target);
      expect(new Set(distractors).size).toBe(distractors.length);

      const all = [target].concat(distractors);
      all.forEach((idA, i) => {
        all.forEach((idB, j) => {
          if (i !== j) {
            expect(areIndistinguishable(idA, idB)).toBe(false);
          }
        });
      });
    }
  });

  test('returns fewer than count when the pool cannot supply enough compatible candidates', () => {
    const [a, b] = SHADOW_INDISTINGUISHABLE_PAIRS[0];
    const tinyPool = [a, b];
    const distractors = pickDistractors(a, tinyPool, DISTRACTORS_PER_ROUND, Math.random);
    expect(distractors).toHaveLength(0);
  });
});

describe('pickTarget', () => {
  test('never repeats previousDinosaurId when the pool has another option', () => {
    const random = createRandom('target');
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const target = pickTarget(APPROVED[0], APPROVED, random);
      expect(target).not.toBe(APPROVED[0]);
    }
  });

  test('falls back to the only option when the pool has just one creature', () => {
    expect(pickTarget('anything', [DINOSAURS.TREX], Math.random)).toBe(DINOSAURS.TREX);
  });
});

describe('generateShadowRound', () => {
  test('throws for an out-of-range roundIndex', () => {
    expect(() => generateShadowRound({ roundIndex: -1, level: 1 })).toThrow();
    expect(() => generateShadowRound({ roundIndex: ROUNDS_PER_GAME, level: 1 })).toThrow();
  });

  test('throws for an invalid level', () => {
    expect(() => generateShadowRound({ roundIndex: 0, level: 0 })).toThrow();
    expect(() => generateShadowRound({ roundIndex: 0, level: 11 })).toThrow();
  });

  test('blocks generation with a localized error when the approved catalog has fewer than SHADOW_MODE_MIN_APPROVED creatures', () => {
    const tinySheets = {};
    APPROVED.slice(0, SHADOW_MODE_MIN_APPROVED - 1).forEach((id) => {
      tinySheets[id] = CREATURE_SHEETS[id];
    });

    const round = generateShadowRound({ roundIndex: 0, level: 1, sheets: tinySheets });

    expect(round).toEqual({
      error: ERRORS.CATALOG_TOO_SMALL,
      details: { need: SHADOW_MODE_MIN_APPROVED, have: SHADOW_MODE_MIN_APPROVED - 1 },
    });
  });

  test('builds a well-formed round against the real catalog', () => {
    const random = createRandom('round-shape');
    const round = generateShadowRound({ roundIndex: 3, level: 5, randomFn: random });

    expect(round.error).toBeUndefined();
    expect(round.roundIndex).toBe(3);
    expect(round.level).toBe(5);
    expect(round.status).toBe('playing');
    expect(round.options).toHaveLength(OPTIONS_PER_ROUND);
    expect(new Set(round.options).size).toBe(OPTIONS_PER_ROUND);
    expect(round.options).toContain(round.correctId);
    expect(APPROVED).toContain(round.correctId);
  });

  test('never shows two indistinguishable creatures as different options in the same round, across many seeds', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const random = createRandom(`pairs-${seed}`);
      const round = generateShadowRound({ roundIndex: 0, level: 8, randomFn: random });
      round.options.forEach((idA, i) => {
        round.options.forEach((idB, j) => {
          if (i !== j) {
            expect(areIndistinguishable(idA, idB)).toBe(false);
          }
        });
      });
    }
  });

  test('never applies a transform outside the target creature\'s own shadowMeta.allowedTransforms at any level', () => {
    for (let level = 1; level <= 10; level += 1) {
      for (let seed = 0; seed < 15; seed += 1) {
        const random = createRandom(`transform-${level}-${seed}`);
        const round = generateShadowRound({ roundIndex: 0, level, randomFn: random });
        if (round.transform !== null) {
          const allowed = CREATURE_SHEETS[round.correctId].shadowMeta.allowedTransforms;
          expect(allowed).toContain(round.transform);
        }
      }
    }
  });

  test('below LEVEL_UNLOCKS_FLIP every round is untransformed (identity)', () => {
    for (let level = 1; level < LEVEL_UNLOCKS_FLIP; level += 1) {
      for (let seed = 0; seed < 10; seed += 1) {
        const random = createRandom(`identity-${level}-${seed}`);
        const round = generateShadowRound({ roundIndex: 0, level, randomFn: random });
        expect(round.transform).toBeNull();
      }
    }
  });

  test('never picks a transform whose bounding box would exceed GAME_AREA', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const random = createRandom(`bounds-${seed}`);
      const round = generateShadowRound({ roundIndex: 0, level: 10, randomFn: random });
      const box = getSilhouetteBox(round.correctId);
      expect(fitsWithinGameArea(applyTransformToBox(box, round.transform))).toBe(true);
    }
  });

  test('a transform never changes which creature is the correct answer', () => {
    const random = createRandom('identity-of-answer');
    const round = generateShadowRound({ roundIndex: 0, level: 10, randomFn: random });
    expect(APPROVED).toContain(round.correctId);
    expect(round.correctId).toBe(round.correctId);
  });

  test('reports ERRORS.SILHOUETTE_OUT_OF_BOUNDS when no transform (not even identity) fits an overridden game area', () => {
    const round = generateShadowRound({
      roundIndex: 0,
      level: 1,
      gameArea: { width: 1, height: 1 },
    });
    expect(round).toEqual({
      error: ERRORS.SILHOUETTE_OUT_OF_BOUNDS,
      details: { dinosaurId: round.details.dinosaurId },
    });
  });

  test('reports ERRORS.NOT_ENOUGH_DISTRACTORS when compatibility rules leave fewer than DISTRACTORS_PER_ROUND candidates', () => {
    const pool = APPROVED.slice(0, SHADOW_MODE_MIN_APPROVED);
    const sheets = {};
    pool.forEach((id) => {
      sheets[id] = CREATURE_SHEETS[id];
    });
    const target = pool[0];
    // Marks the target indistinguishable from every candidate except the
    // last, leaving only one compatible distractor (< DISTRACTORS_PER_ROUND).
    const forcedPairs = pool.slice(1, pool.length - 1).map((id) => [target, id]);

    const round = generateShadowRound({
      roundIndex: 0,
      level: 1,
      sheets,
      indistinguishablePairs: forcedPairs,
      randomFn: () => 0,
    });

    expect(round).toEqual({
      error: ERRORS.NOT_ENOUGH_DISTRACTORS,
      details: { dinosaurId: target, need: DISTRACTORS_PER_ROUND, have: 1 },
    });
  });
});

describe('generateShadowRounds', () => {
  test('builds exactly ROUNDS_PER_GAME rounds, never repeating the correct creature back to back', () => {
    const random = createRandom('full-game');
    const result = generateShadowRounds({ level: 6, randomFn: random });

    expect(result.error).toBeUndefined();
    expect(result.rounds).toHaveLength(ROUNDS_PER_GAME);
    result.rounds.forEach((round, index) => {
      expect(round.roundIndex).toBe(index);
      expect(round.options).toContain(round.correctId);
    });
    for (let i = 1; i < result.rounds.length; i += 1) {
      expect(result.rounds[i].correctId).not.toBe(result.rounds[i - 1].correctId);
    }
  });

  test('propagates the catalog-too-small error instead of building any round', () => {
    const tinySheets = {};
    APPROVED.slice(0, SHADOW_MODE_MIN_APPROVED - 1).forEach((id) => {
      tinySheets[id] = CREATURE_SHEETS[id];
    });

    const result = generateShadowRounds({ level: 1, sheets: tinySheets });

    expect(result.error).toBe(ERRORS.CATALOG_TOO_SMALL);
    expect(result.rounds).toBeUndefined();
  });
});
