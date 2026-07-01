import { saveBestScore, getBestScore } from '../utils/bestScorePersistence';

describe('Best Score Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save and retrieve the best score correctly', () => {
    saveBestScore(8);
    expect(getBestScore()).toBe(8);
  });

  it('should not update the best score if the new score is lower', () => {
    saveBestScore(10);
    saveBestScore(7);
    expect(getBestScore()).toBe(10);
  });

  it('should not update the best score if the new score is a tie', () => {
    saveBestScore(9);
    saveBestScore(9);
    expect(getBestScore()).toBe(9);
  });
});