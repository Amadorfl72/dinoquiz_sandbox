'use strict';

const { DINOSAURS, VALID_DINOSAURS } = require('./questionBank');
const {
  DIETS,
  SHADOW_COMPATIBILITY_GROUPS,
  SHADOW_TRANSFORMS,
  SHADOW_INDISTINGUISHABLE_PAIRS,
  SHADOW_MODE_MIN_APPROVED,
  CREATURE_SHEETS,
  getCreatureSheet,
  getCreatureDiet,
  getApprovedShadowCreatures,
  isShadowModeUnlocked,
} = require('./creatureSheet');

describe('creatureSheet', () => {
  test('every shipped dinosaur has exactly one verified sheet with a valid diet', () => {
    VALID_DINOSAURS.forEach((dinosaurId) => {
      const sheet = getCreatureSheet(dinosaurId);
      expect(sheet).toBeDefined();
      expect(sheet.id).toBe(dinosaurId);
      expect(Object.values(DIETS)).toContain(sheet.diet);
    });
  });

  test('getCreatureDiet mirrors getCreatureSheet(id).diet', () => {
    expect(getCreatureDiet(DINOSAURS.TREX)).toBe(DIETS.CARNIVORO);
    expect(getCreatureDiet(DINOSAURS.TRICERATOPS)).toBe(DIETS.HERBIVORO);
  });

  test('returns undefined for an unknown id instead of guessing a diet', () => {
    expect(getCreatureSheet('unknown-creature')).toBeUndefined();
    expect(getCreatureDiet('unknown-creature')).toBeUndefined();
  });

  test('CREATURE_SHEETS is frozen (single source of truth, never mutated by a caller)', () => {
    expect(Object.isFrozen(CREATURE_SHEETS)).toBe(true);
    expect(Object.isFrozen(CREATURE_SHEETS[DINOSAURS.TREX])).toBe(true);
  });

  describe('shadowMeta', () => {
    test('every shipped dinosaur declares a well-formed shadowMeta block', () => {
      VALID_DINOSAURS.forEach((dinosaurId) => {
        const sheet = getCreatureSheet(dinosaurId);
        expect(sheet.shadowMeta).toBeDefined();
        expect(typeof sheet.shadowMeta.approved).toBe('boolean');
        expect(Array.isArray(sheet.shadowMeta.allowedTransforms)).toBe(true);
        sheet.shadowMeta.allowedTransforms.forEach((transform) => {
          expect(Object.values(SHADOW_TRANSFORMS)).toContain(transform);
        });

        if (sheet.shadowMeta.approved) {
          expect(Object.values(SHADOW_COMPATIBILITY_GROUPS)).toContain(sheet.shadowMeta.compatibilityGroup);
        } else {
          expect(sheet.shadowMeta.compatibilityGroup).toBeNull();
          expect(sheet.shadowMeta.allowedTransforms).toHaveLength(0);
        }
      });
    });

    test('shadowMeta never duplicates diet/size/era -- only silhouette fields', () => {
      VALID_DINOSAURS.forEach((dinosaurId) => {
        const keys = Object.keys(getCreatureSheet(dinosaurId).shadowMeta);
        expect(keys.sort()).toEqual(['allowedTransforms', 'approved', 'compatibilityGroup']);
      });
    });

    test('CREATURE_SHEETS entries and their shadowMeta are frozen', () => {
      expect(Object.isFrozen(CREATURE_SHEETS[DINOSAURS.TREX].shadowMeta)).toBe(true);
    });

    test('getApprovedShadowCreatures returns only ids with shadowMeta.approved', () => {
      const approved = getApprovedShadowCreatures();
      expect(approved).toContain(DINOSAURS.TREX);
      expect(approved).not.toContain(DINOSAURS.COMPSOGNATHUS);
      approved.forEach((id) => {
        expect(getCreatureSheet(id).shadowMeta.approved).toBe(true);
      });
    });

    test('isShadowModeUnlocked reflects the >=12 approved-creature requirement', () => {
      expect(getApprovedShadowCreatures().length).toBeGreaterThanOrEqual(SHADOW_MODE_MIN_APPROVED);
      expect(isShadowModeUnlocked()).toBe(true);

      const tooFewApproved = {
        [DINOSAURS.TREX]: CREATURE_SHEETS[DINOSAURS.TREX],
        [DINOSAURS.TRICERATOPS]: CREATURE_SHEETS[DINOSAURS.TRICERATOPS],
      };
      expect(isShadowModeUnlocked(tooFewApproved)).toBe(false);
    });

    test('SHADOW_INDISTINGUISHABLE_PAIRS only pairs known, approved creatures', () => {
      expect(SHADOW_INDISTINGUISHABLE_PAIRS.length).toBeGreaterThan(0);
      SHADOW_INDISTINGUISHABLE_PAIRS.forEach((pair) => {
        expect(pair).toHaveLength(2);
        pair.forEach((id) => {
          expect(VALID_DINOSAURS).toContain(id);
          expect(getCreatureSheet(id).shadowMeta.approved).toBe(true);
        });
      });
    });
  });
});
