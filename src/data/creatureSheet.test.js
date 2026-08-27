'use strict';

const { DINOSAURS, VALID_DINOSAURS } = require('./questionBank');
const { DIETS, CREATURE_SHEETS, getCreatureSheet, getCreatureDiet } = require('./creatureSheet');

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
});
