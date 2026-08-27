'use strict';

const {
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
} = require('./sizeOrderRoundGenerator');
const { CREATURE_SHEETS } = require('../data/creatureSheet');

/** Applies a swap of positions i/j (no mutation) -- used to probe for alternate "fixes" of a shuffled order. */
function swapAt(order, i, j) {
  const copy = order.slice();
  const temp = copy[i];
  copy[i] = copy[j];
  copy[j] = temp;
  return copy;
}

function allIndexPairs(length) {
  const pairs = [];
  for (let i = 0; i < length; i += 1) {
    for (let j = i + 1; j < length; j += 1) {
      pairs.push([i, j]);
    }
  }
  return pairs;
}

describe('relativeDifference', () => {
  test('is symmetric and relative to the smaller value', () => {
    expect(relativeDifference(9, 10.5)).toBeCloseTo((10.5 - 9) / 9, 10);
    expect(relativeDifference(10.5, 9)).toBeCloseTo((10.5 - 9) / 9, 10);
  });

  test('is 0 for equal lengths', () => {
    expect(relativeDifference(10, 10)).toBe(0);
  });

  test('is Infinity when the smaller value is not positive', () => {
    expect(relativeDifference(0, 5)).toBe(Infinity);
  });
});

describe('hasUnambiguousGaps', () => {
  test('true when every consecutive pair clears the threshold', () => {
    expect(hasUnambiguousGaps([1, 2, 4, 8], 0.5)).toBe(true);
  });

  test('false as soon as one consecutive pair falls short', () => {
    expect(hasUnambiguousGaps([1, 1.05, 4, 8], 0.15)).toBe(false);
  });

  test('true for a single-element or empty list (nothing to compare)', () => {
    expect(hasUnambiguousGaps([5], 0.9)).toBe(true);
    expect(hasUnambiguousGaps([], 0.9)).toBe(true);
  });
});

describe('getCombinations', () => {
  test('returns every k-combination of a small set', () => {
    const combos = getCombinations([1, 2, 3, 4], 2);
    expect(combos).toHaveLength(6);
    expect(combos).toEqual(
      expect.arrayContaining([
        [1, 2],
        [1, 3],
        [1, 4],
        [2, 3],
        [2, 4],
        [3, 4],
      ])
    );
  });

  test('returns the full set as a single combination when size equals length', () => {
    expect(getCombinations(['a', 'b'], 2)).toEqual([['a', 'b']]);
  });

  test('returns nothing when size is 0, negative or larger than the pool', () => {
    expect(getCombinations([1, 2, 3], 0)).toEqual([]);
    expect(getCombinations([1, 2, 3], -1)).toEqual([]);
    expect(getCombinations([1, 2, 3], 4)).toEqual([]);
  });
});

describe('getSizedCreatures', () => {
  test('every shipped creature sheet has a usable positive lengthMeters', () => {
    const sized = getSizedCreatures();
    expect(sized).toHaveLength(Object.keys(CREATURE_SHEETS).length);
    sized.forEach((creature) => {
      expect(typeof creature.id).toBe('string');
      expect(creature.lengthMeters).toBeGreaterThan(0);
    });
  });

  test('excludes sheets with a missing/invalid lengthMeters', () => {
    const sheets = {
      ok: { id: 'ok', lengthMeters: 5 },
      missing: { id: 'missing' },
      zero: { id: 'zero', lengthMeters: 0 },
      negative: { id: 'negative', lengthMeters: -3 },
      notNumber: { id: 'notNumber', lengthMeters: '5' },
    };
    expect(getSizedCreatures(sheets)).toEqual([{ id: 'ok', lengthMeters: 5 }]);
  });
});

describe('isValidCreatureCount', () => {
  test('accepts only 3 or 4', () => {
    expect(isValidCreatureCount(MIN_CREATURES_PER_ROUND)).toBe(true);
    expect(isValidCreatureCount(MAX_CREATURES_PER_ROUND)).toBe(true);
    expect(isValidCreatureCount(2)).toBe(false);
    expect(isValidCreatureCount(5)).toBe(false);
    expect(isValidCreatureCount(3.5)).toBe(false);
    expect(isValidCreatureCount('3')).toBe(false);
  });
});

describe('getValidCombinations', () => {
  test('throws for an invalid creatureCount', () => {
    expect(() => getValidCombinations({ creatureCount: 2 })).toThrow();
    expect(() => getValidCombinations({ creatureCount: 5 })).toThrow();
  });

  test('every returned combination is sorted ascending and clears the min relative difference', () => {
    [MIN_CREATURES_PER_ROUND, MAX_CREATURES_PER_ROUND].forEach((creatureCount) => {
      const combinations = getValidCombinations({ creatureCount });
      expect(combinations.length).toBeGreaterThan(0);

      combinations.forEach((combination) => {
        expect(combination).toHaveLength(creatureCount);
        for (let i = 1; i < combination.length; i += 1) {
          expect(combination[i].lengthMeters).toBeGreaterThan(combination[i - 1].lengthMeters);
          expect(relativeDifference(combination[i - 1].lengthMeters, combination[i].lengthMeters)).toBeGreaterThanOrEqual(
            DEFAULT_MIN_RELATIVE_DIFFERENCE
          );
        }
      });
    });
  });

  test('a stricter minRelativeDifference never returns more combinations than a looser one', () => {
    const loose = getValidCombinations({ creatureCount: 4, minRelativeDifference: 0.05 });
    const strict = getValidCombinations({ creatureCount: 4, minRelativeDifference: 0.9 });
    expect(strict.length).toBeLessThanOrEqual(loose.length);
  });

  test('returns nothing when the creature pool is smaller than creatureCount', () => {
    const combinations = getValidCombinations({
      creatures: [
        { id: 'a', lengthMeters: 1 },
        { id: 'b', lengthMeters: 5 },
      ],
      creatureCount: MIN_CREATURES_PER_ROUND,
    });
    expect(combinations).toEqual([]);
  });

  test('returns nothing when no pair of creatures clears an impossibly high minRelativeDifference', () => {
    const combinations = getValidCombinations({ creatureCount: MIN_CREATURES_PER_ROUND, minRelativeDifference: 1000 });
    expect(combinations).toEqual([]);
  });
});

describe('getMismatchedIndices', () => {
  test('lists every index where two same-length arrays differ', () => {
    expect(getMismatchedIndices(['a', 'b', 'c'], ['a', 'c', 'b'])).toEqual([1, 2]);
    expect(getMismatchedIndices(['a', 'b'], ['a', 'b'])).toEqual([]);
  });
});

describe('buildInitialOrder', () => {
  test('always swaps exactly two distinct positions of the correct order', () => {
    const correctOrder = ['a', 'b', 'c', 'd'];
    // Exercise every draw the mulberry32 PRNG could produce for this length by
    // feeding it every value in [0, 1) at a fine enough resolution.
    for (let i = 0; i < 50; i += 1) {
      const values = [i / 50, (i + 7) / 53];
      let call = 0;
      const random = () => values[call++ % values.length];

      const initialOrder = buildInitialOrder(correctOrder, random);
      expect(initialOrder.slice().sort()).toEqual(correctOrder.slice().sort());
      expect(getMismatchedIndices(initialOrder, correctOrder)).toHaveLength(2);
    }
  });
});

describe('generateSizeOrderRound: exhaustive ambiguity check over every generatable combination', () => {
  [MIN_CREATURES_PER_ROUND, MAX_CREATURES_PER_ROUND].forEach((creatureCount) => {
    test(`every valid ${creatureCount}-creature combination produces an unambiguous, single-swap-solvable round`, () => {
      const combinations = getValidCombinations({ creatureCount });
      expect(combinations.length).toBeGreaterThan(0);

      combinations.forEach((combination) => {
        const correctOrder = combination.map((creature) => creature.id);
        const lengths = combination.map((creature) => creature.lengthMeters);

        // The correct order must be strictly ascending -- no ties, or "the
        // correct order" itself would be ambiguous.
        for (let i = 1; i < lengths.length; i += 1) {
          expect(lengths[i]).toBeGreaterThan(lengths[i - 1]);
        }

        allIndexPairs(correctOrder.length).forEach(([i, j]) => {
          const initialOrder = swapAt(correctOrder, i, j);

          // Not already solved.
          expect(initialOrder).not.toEqual(correctOrder);
          expect(getMismatchedIndices(initialOrder, correctOrder)).toEqual([i, j]);

          // Swapping back the same two positions is the fix.
          expect(swapAt(initialOrder, i, j)).toEqual(correctOrder);

          // No other single swap also reaches the correct order -- the fix is
          // unique, so the round is never ambiguous about which swap to make.
          allIndexPairs(correctOrder.length)
            .filter(([p, q]) => !(p === i && q === j))
            .forEach(([p, q]) => {
              expect(swapAt(initialOrder, p, q)).not.toEqual(correctOrder);
            });
        });
      });
    });
  });
});

describe('generateSizeOrderRound', () => {
  test('is deterministic for the same seed', () => {
    const first = generateSizeOrderRound({ seed: 'ronda-1' });
    const second = generateSizeOrderRound({ seed: 'ronda-1' });
    expect(second).toEqual(first);
  });

  test('picks a creatureCount of 3 or 4 when none is given', () => {
    for (let i = 0; i < 20; i += 1) {
      const round = generateSizeOrderRound({ seed: `auto-count-${i}` });
      expect([MIN_CREATURES_PER_ROUND, MAX_CREATURES_PER_ROUND]).toContain(round.creatureCount);
    }
  });

  test('honors an explicit creatureCount', () => {
    const round = generateSizeOrderRound({ seed: 'explicit', creatureCount: MAX_CREATURES_PER_ROUND });
    expect(round.creatureCount).toBe(MAX_CREATURES_PER_ROUND);
    expect(round.correctOrder).toHaveLength(MAX_CREATURES_PER_ROUND);
  });

  test('throws for an invalid explicit creatureCount', () => {
    expect(() => generateSizeOrderRound({ creatureCount: 2 })).toThrow();
    expect(() => generateSizeOrderRound({ creatureCount: 5 })).toThrow();
  });

  test('returns real lengths, a correct order sorted ascending, and an initial order one swap away', () => {
    const round = generateSizeOrderRound({ seed: 'shape-check' });

    expect(round.error).toBeUndefined();
    expect(round.creatures).toHaveLength(round.creatureCount);
    expect(round.correctOrder).toHaveLength(round.creatureCount);
    expect(round.initialOrder).toHaveLength(round.creatureCount);

    const lengthById = {};
    round.creatures.forEach((creature) => {
      lengthById[creature.id] = creature.lengthMeters;
      expect(CREATURE_SHEETS[creature.id].lengthMeters).toBe(creature.lengthMeters);
    });

    // correctOrder is exactly the creatures, sorted ascending by real length.
    for (let i = 1; i < round.correctOrder.length; i += 1) {
      expect(lengthById[round.correctOrder[i]]).toBeGreaterThan(lengthById[round.correctOrder[i - 1]]);
    }

    // initialOrder is a permutation of correctOrder that differs at exactly two positions.
    expect(round.initialOrder.slice().sort()).toEqual(round.correctOrder.slice().sort());
    expect(getMismatchedIndices(round.initialOrder, round.correctOrder)).toHaveLength(2);
  });

  test('respects a custom minRelativeDifference', () => {
    const round = generateSizeOrderRound({ seed: 'custom-diff', minRelativeDifference: 0.3 });
    expect(round.error).toBeUndefined();
    const lengths = round.correctOrder.map((id) => round.creatures.find((c) => c.id === id).lengthMeters);
    for (let i = 1; i < lengths.length; i += 1) {
      expect(relativeDifference(lengths[i - 1], lengths[i])).toBeGreaterThanOrEqual(0.3);
    }
  });

  test('returns a local failure code (and no round) when no combination clears the minimum difference', () => {
    const round = generateSizeOrderRound({
      seed: 'no-combo',
      creatureCount: MIN_CREATURES_PER_ROUND,
      minRelativeDifference: 1000,
    });

    expect(round).toEqual({
      error: ERRORS.NO_VALID_COMBINATION,
      creatureCount: MIN_CREATURES_PER_ROUND,
      minRelativeDifference: 1000,
    });
    expect(round.creatures).toBeUndefined();
    expect(round.correctOrder).toBeUndefined();
    expect(round.initialOrder).toBeUndefined();
  });

  test('returns a local failure code when the creature pool is smaller than creatureCount', () => {
    const round = generateSizeOrderRound({
      creatures: [
        { id: 'a', lengthMeters: 1 },
        { id: 'b', lengthMeters: 5 },
      ],
      creatureCount: MIN_CREATURES_PER_ROUND,
    });
    expect(round.error).toBe(ERRORS.NO_VALID_COMBINATION);
  });
});
