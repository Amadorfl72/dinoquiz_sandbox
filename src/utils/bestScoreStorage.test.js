import { getBestScore, saveBestScore } from './bestScoreStorage';

describe('Best Score Persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('should return 0 if no best score is saved', () => {
    expect(getBestScore()).toBe(0);
  });

  it('should save and read the best score', () => {
    saveBestScore(150);
    expect(window.localStorage.getItem('bestScore')).toBe('150');
    expect(getBestScore()).toBe(150);
  });

  it('should not save a lower score than the current best', () => {
    saveBestScore(200);
    saveBestScore(100);
    expect(getBestScore()).toBe(200);
  });

  it('should handle localStorage read failures gracefully without throwing', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('LocalStorage disabled');
    });
    expect(() => getBestScore()).not.toThrow();
    expect(getBestScore()).toBe(0);
  });

  it('should handle localStorage write failures gracefully without throwing', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    expect(() => saveBestScore(300)).not.toThrow();
  });
});