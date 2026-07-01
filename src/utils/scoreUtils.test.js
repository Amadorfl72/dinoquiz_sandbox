const { compareScores, updateBestScore, getStars } = require('./scoreUtils');

describe('TRIOFSND-44: Best score comparison and update logic', () => {
  describe('compareScores', () => {
    test('should return true when current score is higher than best score', () => {
      expect(compareScores(8, 5)).toBe(true);
    });

    test('should return false when current score is lower than best score', () => {
      expect(compareScores(3, 5)).toBe(false);
    });

    test('should return false when scores are equal', () => {
      expect(compareScores(5, 5)).toBe(false);
    });

    test('should handle negative scores', () => {
      expect(compareScores(-3, -5)).toBe(true);
      expect(compareScores(-5, -3)).toBe(false);
    });

    test('should handle null/undefined scores', () => {
      expect(compareScores(null, 5)).toBe(false);
      expect(compareScores(5, null)).toBe(true);
      expect(compareScores(undefined, 5)).toBe(false);
      expect(compareScores(5, undefined)).toBe(true);
    });
  });

  describe('updateBestScore', () => {
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

  describe('getStars', () => {
    test('should return 3 stars for scores 7-10', () => {
      expect(getStars(7)).toBe(3);
      expect(getStars(10)).toBe(3);
    });

    test('should return 2 stars for scores 4-6', () => {
      expect(getStars(4)).toBe(2);
      expect(getStars(6)).toBe(2);
    });

    test('should return 1 star for scores 0-3', () => {
      expect(getStars(0)).toBe(1);
      expect(getStars(3)).toBe(1);
    });

    test('should handle negative scores by treating as 0', () => {
      expect(getStars(-5)).toBe(1);
    });

    test('should handle null/undefined scores by treating as 0', () => {
      expect(getStars(null)).toBe(1);
      expect(getStars(undefined)).toBe(1);
    });
  });
});