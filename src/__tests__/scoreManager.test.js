const { getBestScore, saveBestScore, checkAndSaveBestScore } = require('../scoreManager');

describe('TRIOFSND-33: Best Score Persistence and Feedback', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Reading best score', () => {
    it('should return the best score from localStorage if it exists', () => {
      localStorage.setItem('bestScore', '150');
      expect(getBestScore()).toBe(150);
    });

    it('should return 0 if no best score is saved', () => {
      expect(getBestScore()).toBe(0);
    });

    it('should handle localStorage read failures gracefully by returning 0', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(getBestScore()).toBe(0);
    });
  });

  describe('Writing best score', () => {
    it('should save the best score to localStorage', () => {
      saveBestScore(200);
      expect(localStorage.getItem('bestScore')).toBe('200');
    });

    it('should handle localStorage write failures gracefully without throwing', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => saveBestScore(300)).not.toThrow();
    });
  });

  describe('Feedback on new best score', () => {
    it('should return "¡Nueva mejor puntuación!" and save score if current score beats persisted one', () => {
      localStorage.setItem('bestScore', '100');
      const result = checkAndSaveBestScore(150);
      expect(result.feedback).toBe('¡Nueva mejor puntuación!');
      expect(localStorage.getItem('bestScore')).toBe('150');
    });

    it('should not return feedback and not overwrite score if current score does not beat persisted one', () => {
      localStorage.setItem('bestScore', '200');
      const result = checkAndSaveBestScore(150);
      expect(result.feedback).toBeNull();
      expect(localStorage.getItem('bestScore')).toBe('200');
    });

    it('should return feedback if no best score was previously saved', () => {
      const result = checkAndSaveBestScore(50);
      expect(result.feedback).toBe('¡Nueva mejor puntuación!');
      expect(localStorage.getItem('bestScore')).toBe('50');
    });
  });
});