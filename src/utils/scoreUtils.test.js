import { checkAndUpdateBestScore } from './scoreUtils';

describe('TRIOFSND-40: Actualizar mejor puntuación en localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should update best score in localStorage if current score is greater', () => {
    localStorage.setItem('bestScore', '100');
    const isNewBestScore = checkAndUpdateBestScore(150);
    expect(isNewBestScore).toBe(true);
    expect(localStorage.getItem('bestScore')).toBe('150');
  });

  it('should not update best score if current score is lower', () => {
    localStorage.setItem('bestScore', '200');
    const isNewBestScore = checkAndUpdateBestScore(150);
    expect(isNewBestScore).toBe(false);
    expect(localStorage.getItem('bestScore')).toBe('200');
  });

  it('should not update best score if current score is equal', () => {
    localStorage.setItem('bestScore', '150');
    const isNewBestScore = checkAndUpdateBestScore(150);
    expect(isNewBestScore).toBe(false);
    expect(localStorage.getItem('bestScore')).toBe('150');
  });

  it('should update best score if no score is saved in localStorage', () => {
    const isNewBestScore = checkAndUpdateBestScore(50);
    expect(isNewBestScore).toBe(true);
    expect(localStorage.getItem('bestScore')).toBe('50');
  });
});