import { compareScores, updateBestScore } from '../scoreUtils';

describe('Score Utils', () => {
  describe('compareScores', () => {
    it('should return true if current score is greater than best score', () => {
      expect(compareScores(8, 5)).toBe(true);
    });

    it('should return false if current score is less than or equal to best score', () => {
      expect(compareScores(5, 8)).toBe(false);
      expect(compareScores(5, 5)).toBe(false);
    });
  });

  describe('updateBestScore', () => {
    it('should return current score if it is greater than best score', () => {
      expect(updateBestScore(8, 5)).toBe(8);
    });

    it('should return best score if current score is less than or equal to best score', () => {
      expect(updateBestScore(5, 8)).toBe(8);
      expect(updateBestScore(5, 5)).toBe(5);
    });
  });
});