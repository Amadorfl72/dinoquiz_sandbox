'use strict';

const { DINOSAURS, VALID_DINOSAURS } = require('./questionBank');
const {
  DIETS,
  CREATURE_SHEETS,
  getCreatureSheet,
  getCreatureDiet,
  getCreatureLengthMeters,
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

  test('every shipped dinosaur has a positive, finite verified lengthMeters', () => {
    VALID_DINOSAURS.forEach((dinosaurId) => {
      const sheet = getCreatureSheet(dinosaurId);
      expect(typeof sheet.lengthMeters).toBe('number');
      expect(Number.isFinite(sheet.lengthMeters)).toBe(true);
      expect(sheet.lengthMeters).toBeGreaterThan(0);
    });
  });

  test('getCreatureDiet mirrors getCreatureSheet(id).diet', () => {
    expect(getCreatureDiet(DINOSAURS.TREX)).toBe(DIETS.CARNIVORO);
    expect(getCreatureDiet(DINOSAURS.TRICERATOPS)).toBe(DIETS.HERBIVORO);
  });

  test('getCreatureLengthMeters mirrors getCreatureSheet(id).lengthMeters', () => {
    expect(getCreatureLengthMeters(DINOSAURS.TREX)).toBe(12);
    expect(getCreatureLengthMeters(DINOSAURS.COMPSOGNATHUS)).toBe(1);
  });

  test('returns undefined for an unknown id instead of guessing a diet or length', () => {
    expect(getCreatureSheet('unknown-creature')).toBeUndefined();
    expect(getCreatureDiet('unknown-creature')).toBeUndefined();
    expect(getCreatureLengthMeters('unknown-creature')).toBeUndefined();
  });

  test('CREATURE_SHEETS is frozen (single source of truth, never mutated by a caller)', () => {
    expect(Object.isFrozen(CREATURE_SHEETS)).toBe(true);
    expect(Object.isFrozen(CREATURE_SHEETS[DINOSAURS.TREX])).toBe(true);
  });
});
