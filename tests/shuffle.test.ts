import { shuffleOptions } from '../src/shuffle';

describe('TRIOFSND-17: Implement Option Shuffling', () => {
  const originalOptions = ['Option A', 'Option B', 'Option C'];

  it('should return an array of the same length as the input', () => {
    const shuffled = shuffleOptions([...originalOptions]);
    expect(shuffled.length).toBe(originalOptions.length);
  });

  it('should contain all the same elements as the original options', () => {
    const shuffled = shuffleOptions([...originalOptions]);
    expect(shuffled).toEqual(expect.arrayContaining(originalOptions));
  });

  it('should not mutate the original array', () => {
    const originalCopy = [...originalOptions];
    shuffleOptions(originalOptions);
    expect(originalOptions).toEqual(originalCopy);
  });

  it('should produce different orders over multiple calls (randomization)', () => {
    const results = new Set();
    for (let i = 0; i < 100; i++) {
      results.add(shuffleOptions([...originalOptions]).join(','));
    }
    // With 3 options, there are 6 possible permutations.
    // Over 100 calls, we should expect to see more than 1 permutation.
    expect(results.size).toBeGreaterThan(1);
  });

  it('should handle an empty array', () => {
    expect(shuffleOptions([])).toEqual([]);
  });

  it('should handle an array with one option', () => {
    expect(shuffleOptions(['Only Option'])).toEqual(['Only Option']);
  });
});
