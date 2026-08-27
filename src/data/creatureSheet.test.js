'use strict';

const { DINOSAURS, VALID_DINOSAURS } = require('./questionBank');
const {
  DIETS,
  VISUAL_FAMILIES,
  CREATURE_SHEETS,
  getCreatureSheet,
  getCreatureDiet,
  getCreatureVisualFamily,
} = require('./creatureSheet');

describe('creatureSheet', () => {
  test('every shipped dinosaur has exactly one verified sheet with a valid diet and visual family', () => {
    VALID_DINOSAURS.forEach((dinosaurId) => {
      const sheet = getCreatureSheet(dinosaurId);
      expect(sheet).toBeDefined();
      expect(sheet.id).toBe(dinosaurId);
      expect(Object.values(DIETS)).toContain(sheet.diet);
      expect(Object.values(VISUAL_FAMILIES)).toContain(sheet.visualFamily);
    });
  });

  test('getCreatureDiet mirrors getCreatureSheet(id).diet', () => {
    expect(getCreatureDiet(DINOSAURS.TREX)).toBe(DIETS.CARNIVORO);
    expect(getCreatureDiet(DINOSAURS.TRICERATOPS)).toBe(DIETS.HERBIVORO);
  });

  test('getCreatureVisualFamily mirrors getCreatureSheet(id).visualFamily', () => {
    expect(getCreatureVisualFamily(DINOSAURS.TREX)).toBe(VISUAL_FAMILIES.BIPED_CARNIVORE);
    expect(getCreatureVisualFamily(DINOSAURS.TRICERATOPS)).toBe(VISUAL_FAMILIES.ARMORED_QUADRUPED);
  });

  test('returns undefined for an unknown id instead of guessing a diet or visual family', () => {
    expect(getCreatureSheet('unknown-creature')).toBeUndefined();
    expect(getCreatureDiet('unknown-creature')).toBeUndefined();
    expect(getCreatureVisualFamily('unknown-creature')).toBeUndefined();
  });

  test('CREATURE_SHEETS is frozen (single source of truth, never mutated by a caller)', () => {
    expect(Object.isFrozen(CREATURE_SHEETS)).toBe(true);
    expect(Object.isFrozen(CREATURE_SHEETS[DINOSAURS.TREX])).toBe(true);
  });
});
