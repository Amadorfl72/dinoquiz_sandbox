const { updateBestScore } = require('./scoreUtils');

describe('TRIOFSND-44: Best score comparison and update logic', () => {
  test('should update best score if new score is higher', () => {
    expect(updateBestScore(100, 150)).toBe(150);
  });

  test('should not update best score if new score is lower', () => {
    expect(updateBestScore(200, 150)).toBe(200);
  });

  test('should not update best score if new score is equal', () => {
    expect(updateBestScore(100, 100)).toBe(100);
  });

  test('should handle zero current best score', () => {
    expect(updateBestScore(0, 50)).toBe(50);
  });

  test('should handle zero new score', () => {
    expect(updateBestScore(50, 0)).toBe(50);
  });

  test('should handle negative scores (assuming higher is better)', () => {
    expect(updateBestScore(-10, -5)).toBe(-5);
    expect(updateBestScore(-5, -10)).toBe(-5);
  });

  test('should handle null or undefined current best score by treating it as 0', () => {
    expect(updateBestScore(null, 100)).toBe(100);
    expect(updateBestScore(undefined, 100)).toBe(100);
  });

  test('should handle null or undefined new score by treating it as 0', () => {
    expect(updateBestScore(100, null)).toBe(100);
    expect(updateBestScore(100, undefined)).toBe(100);
  });
});