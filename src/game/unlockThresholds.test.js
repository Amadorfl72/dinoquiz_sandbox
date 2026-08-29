'use strict';

const {
  MIN_LEVEL,
  MAX_LEVEL,
  DEFAULT_UNLOCK_THRESHOLD,
  UNLOCK_THRESHOLDS,
  getUnlockThreshold,
  validateUnlockThresholds,
} = require('./unlockThresholds');
const { MODE_IDS, MODES_CATALOG } = require('./modesCatalog');

describe('UNLOCK_THRESHOLDS (TRIOFSND-248)', () => {
  test('defines a threshold for every mode in MODES_CATALOG', () => {
    MODES_CATALOG.forEach((mode) => {
      expect(UNLOCK_THRESHOLDS[mode.id]).toBeDefined();
    });
  });

  test('defines a threshold for every level from MIN_LEVEL to MAX_LEVEL, for every mode', () => {
    Object.values(MODE_IDS).forEach((modeId) => {
      for (let level = MIN_LEVEL; level <= MAX_LEVEL; level += 1) {
        expect(Number.isInteger(UNLOCK_THRESHOLDS[modeId][level])).toBe(true);
      }
    });
  });
});

describe('getUnlockThreshold', () => {
  test('returns the configured threshold for a valid mode/level pair', () => {
    expect(getUnlockThreshold(MODE_IDS.QUIZ, 1)).toBe(DEFAULT_UNLOCK_THRESHOLD);
    expect(getUnlockThreshold(MODE_IDS.PAREJAS, 5)).toBe(DEFAULT_UNLOCK_THRESHOLD);
  });

  test('throws for a level outside MIN_LEVEL-MAX_LEVEL', () => {
    expect(() => getUnlockThreshold(MODE_IDS.QUIZ, 0)).toThrow();
    expect(() => getUnlockThreshold(MODE_IDS.QUIZ, MAX_LEVEL + 1)).toThrow();
  });

  test('throws for a mode id with no defined threshold table', () => {
    expect(() => getUnlockThreshold('not-a-real-mode', 1)).toThrow();
  });
});

describe('validateUnlockThresholds', () => {
  test('reports valid with no gaps for the shipped table against MODES_CATALOG', () => {
    const report = validateUnlockThresholds();

    expect(report).toEqual({ valid: true, missing: [] });
  });
});
