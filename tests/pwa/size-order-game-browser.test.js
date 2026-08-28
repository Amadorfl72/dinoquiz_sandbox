'use strict';

const path = require('path');

const SIZE_ORDER_GAME_PATH = path.resolve(__dirname, '../../public/scripts/sizeOrderGame.js');

const {
  MODE_ID,
  MIN_CREATURES_PER_ROUND,
  MAX_CREATURES_PER_ROUND,
  ERRORS,
  DINOSAUR_LENGTHS,
  SIZE_ORDER_MODE_MIN_CREATURES,
  isSizeOrderModeUnlocked,
  getSizedCreatures,
  relativeDifference,
  hasUnambiguousGaps,
  getValidCombinations,
  buildInitialOrder,
  generateSizeOrderRound,
  buildSizeOrderRoundContext,
  generateSizeOrderRoundForContract,
} = require(SIZE_ORDER_GAME_PATH);
const { CREATURE_SHEETS, isSizeOrderModeUnlocked: realIsSizeOrderModeUnlocked } = require('../../src/data/creatureSheet');
const { VALID_DINOSAURS } = require('../../src/data/questionBank');
const { MODE_IDS } = require('../../src/game/modesCatalog');

/**
 * TRIOFSND-288: public/scripts/sizeOrderGame.js is the browser-runnable twin
 * of src/game/sizeOrderRoundGenerator.js (see that file's own doc comment
 * for why it can't just re-export it -- the real module's dependency chain
 * requires `fs`, which doesn't exist in a real, unbundled browser). Its
 * local `DINOSAUR_LENGTHS` mirrors src/data/creatureSheet.js's
 * `CREATURE_SHEETS` (`lengthMeters` field only) by hand, so this guards
 * against the two silently drifting apart.
 */
describe('public/scripts/sizeOrderGame.js mirrors the authoritative creature data', () => {
  test('DINOSAUR_LENGTHS covers every shipped dinosaur with the exact same lengthMeters as src/data/creatureSheet.js', () => {
    Object.keys(DINOSAUR_LENGTHS).forEach((id) => {
      expect(VALID_DINOSAURS).toContain(id);
      expect(DINOSAUR_LENGTHS[id]).toBe(CREATURE_SHEETS[id].lengthMeters);
    });
    VALID_DINOSAURS.forEach((id) => {
      expect(DINOSAUR_LENGTHS).toHaveProperty(id, CREATURE_SHEETS[id].lengthMeters);
    });
  });

  test('MODE_ID matches src/game/modesCatalog.js MODE_IDS.ORDENA_POR_TAMANO', () => {
    expect(MODE_ID).toBe(MODE_IDS.ORDENA_POR_TAMANO);
  });

  test('isSizeOrderModeUnlocked agrees with the real, verified creatureSheet.js check', () => {
    expect(isSizeOrderModeUnlocked()).toBe(realIsSizeOrderModeUnlocked());
  });
});

describe('getSizedCreatures', () => {
  test('returns every DINOSAUR_LENGTHS entry as { id, lengthMeters }', () => {
    const creatures = getSizedCreatures();
    expect(creatures).toHaveLength(Object.keys(DINOSAUR_LENGTHS).length);
    creatures.forEach((creature) => {
      expect(creature.lengthMeters).toBe(DINOSAUR_LENGTHS[creature.id]);
    });
  });
});

describe('relativeDifference / hasUnambiguousGaps', () => {
  test('relativeDifference is symmetric and relative to the smaller value', () => {
    expect(relativeDifference(9, 10.5)).toBeCloseTo((10.5 - 9) / 9);
    expect(relativeDifference(10.5, 9)).toBeCloseTo((10.5 - 9) / 9);
  });

  test('hasUnambiguousGaps rejects a list with any consecutive pair under the threshold', () => {
    expect(hasUnambiguousGaps([9, 10], 0.15)).toBe(false); // ~11% apart
    expect(hasUnambiguousGaps([9, 12], 0.15)).toBe(true); // ~33% apart
  });
});

describe('getValidCombinations', () => {
  test('only returns combinations whose sorted lengths clear the minimum relative difference', () => {
    const creatures = [
      { id: 'a', lengthMeters: 1 },
      { id: 'b', lengthMeters: 1.05 }, // too close to 'a'
      { id: 'c', lengthMeters: 5 },
    ];
    const combinations = getValidCombinations({ creatures, creatureCount: 3, minRelativeDifference: 0.15 });
    expect(combinations).toEqual([]);
  });

  test('throws for a creatureCount outside 3..4', () => {
    expect(() => getValidCombinations({ creatures: getSizedCreatures(), creatureCount: 2 })).toThrow();
    expect(() => getValidCombinations({ creatures: getSizedCreatures(), creatureCount: 5 })).toThrow();
  });
});

describe('buildInitialOrder', () => {
  test('swaps exactly two positions relative to the correct order', () => {
    const correctOrder = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 20; i += 1) {
      const randomFn = () => i / 20;
      const initialOrder = buildInitialOrder(correctOrder, randomFn);
      const mismatched = correctOrder.filter((id, index) => id !== initialOrder[index]);
      expect(mismatched).toHaveLength(2);
      expect(initialOrder.slice().sort()).toEqual(correctOrder.slice().sort());
    }
  });
});

describe('generateSizeOrderRound', () => {
  test('generates a round with 3-4 creatures, a correct order sorted ascending by length, and an initial order one swap away', () => {
    for (let i = 0; i < 15; i += 1) {
      const round = generateSizeOrderRound({ randomFn: () => (i + 0.5) / 15 });
      expect(round.error).toBeUndefined();
      expect(round.creatureCount).toBeGreaterThanOrEqual(MIN_CREATURES_PER_ROUND);
      expect(round.creatureCount).toBeLessThanOrEqual(MAX_CREATURES_PER_ROUND);
      expect(round.correctOrder).toHaveLength(round.creatureCount);

      const sortedByLength = round.correctOrder
        .map((id) => round.creatures.find((creature) => creature.id === id).lengthMeters)
        .every((length, index, arr) => index === 0 || arr[index - 1] <= length);
      expect(sortedByLength).toBe(true);

      const mismatched = round.correctOrder.filter((id, index) => id !== round.initialOrder[index]);
      expect(mismatched).toHaveLength(2);
    }
  });

  test('returns the local NO_VALID_COMBINATION error, never a fabricated round, when no combination clears the gap', () => {
    const creatures = [
      { id: 'a', lengthMeters: 1 },
      { id: 'b', lengthMeters: 1.01 },
      { id: 'c', lengthMeters: 1.02 },
    ];
    const round = generateSizeOrderRound({ creatures, creatureCount: 3, randomFn: () => 0 });
    expect(round).toEqual({ error: ERRORS.NO_VALID_COMBINATION, creatureCount: 3, minRelativeDifference: 0.15 });
  });
});

describe('generateSizeOrderRoundForContract / buildSizeOrderRoundContext', () => {
  test('matches roundContract.js\'s generateRound(roundIndex, context) signature and forwards context options through', () => {
    const context = buildSizeOrderRoundContext({ randomFn: () => 0.5, creatureCount: 3 });
    const round = generateSizeOrderRoundForContract(0, context);
    expect(round.error).toBeUndefined();
    expect(round.creatureCount).toBe(3);
  });

  test('defaults randomFn to Math.random when omitted', () => {
    const context = buildSizeOrderRoundContext();
    expect(typeof context.randomFn).toBe('function');
    const round = generateSizeOrderRoundForContract(0, context);
    expect(round.error).toBeUndefined();
  });
});

describe('SIZE_ORDER_MODE_MIN_CREATURES', () => {
  test('mirrors src/game/modesCatalog.js\'s MODES_CATALOG requirement for Ordena por tamaño', () => {
    const { MODES_CATALOG } = require('../../src/game/modesCatalog');
    const mode = MODES_CATALOG.find((entry) => entry.id === MODE_IDS.ORDENA_POR_TAMANO);
    const requirement = mode.requirements.find((entry) => entry.field === 'size');
    expect(SIZE_ORDER_MODE_MIN_CREATURES).toBe(requirement.minCount);
  });
});
