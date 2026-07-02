import { Game } from '../game';
import { ScoreManager } from '../scoreManager';

jest.mock('../scoreManager');

describe('Game - best score UI integration', () => {
  let game;
  let mockScoreManager;

  beforeEach(() => {
    ScoreManager.mockClear();
    mockScoreManager = {
      getBestScore: jest.fn(),
      setBestScore: jest.fn(),
      submitScore: jest.fn(),
      onNewBest: null,
    };
    ScoreManager.mockImplementation(() => mockScoreManager);

    document.body.innerHTML = `
      <div id="game-container"></div>
      <div id="best-score-display"></div>
      <div id="new-best-message" style="display:none;"></div>
    `;

    game = new Game();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('Scenario 1: Best score persists after close/reopen', () => {
    test('should display persisted best score on game initialization', () => {
      mockScoreManager.getBestScore.mockReturnValue(4200);

      game.init();

      const display = document.getElementById('best-score-display');
      expect(display.textContent).toContain('4200');
    });

    test('should load best score from ScoreManager on every init', () => {
      mockScoreManager.getBestScore.mockReturnValue(1000);
      game.init();
      expect(document.getElementById('best-score-display').textContent).toContain('1000');

      // Simulate reopen
      mockScoreManager.getBestScore.mockReturnValue(5000);
      game.init();
      expect(document.getElementById('best-score-display').textContent).toContain('5000');
    });
  });

  describe('Scenario 2: New best updates localStorage and shows message', () => {
    test('should show new best message when submitScore returns isNewBest=true', () => {
      mockScoreManager.getBestScore.mockReturnValue(0);
      mockScoreManager.submitScore.mockReturnValue({
        isNewBest: true,
        score: 1500,
        previousBest: 0,
      });

      game.init();
      game.endRound(1500);

      const message = document.getElementById('new-best-message');
      expect(message.style.display).not.toBe('none');
      expect(message.classList.contains('visible')).toBe(true);
    });

    test('should call submitScore on the ScoreManager when a round ends', () => {
      mockScoreManager.getBestScore.mockReturnValue(0);
      mockScoreManager.submitScore.mockReturnValue({ isNewBest: false, score: 100, previousBest: 0 });

      game.init();
      game.endRound(100);

      expect(mockScoreManager.submitScore).toHaveBeenCalledWith(100);
    });

    test('should update the best score display after a new best', () => {
      mockScoreManager.getBestScore.mockReturnValue(500);
      mockScoreManager.submitScore.mockReturnValue({
        isNewBest: true,
        score: 1200,
        previousBest: 500,
      });
      mockScoreManager.getBestScore.mockReturnValue(1200);

      game.init();
      game.endRound(1200);

      const display = document.getElementById('best-score-display');
      expect(display.textContent).toContain('1200');
    });
  });

  describe('Scenario 3: Tie does not update or show message', () => {
    test('should not show new best message on a tie', () => {
      mockScoreManager.getBestScore.mockReturnValue(1000);
      mockScoreManager.submitScore.mockReturnValue({
        isNewBest: false,
        score: 1000,
        previousBest: 1000,
      });

      game.init();
      game.endRound(1000);

      const message = document.getElementById('new-best-message');
      expect(message.style.display).toBe('none');
      expect(message.classList.contains('visible')).toBe(false);
    });

    test('should not update best score display on a tie', () => {
      mockScoreManager.getBestScore.mockReturnValue(1000);
      mockScoreManager.submitScore.mockReturnValue({
        isNewBest: false,
        score: 1000,
        previousBest: 1000,
      });

      game.init();
      game.endRound(1000);

      const display = document.getElementById('best-score-display');
      expect(display.textContent).toContain('1000');
    });

    test('should not show new best message when score is lower than best', () => {
      mockScoreManager.getBestScore.mockReturnValue(3000);
      mockScoreManager.submitScore.mockReturnValue({
        isNewBest: false,
        score: 500,
        previousBest: 3000,
      });

      game.init();
      game.endRound(500);

      const message = document.getElementById('new-best-message');
      expect(message.style.display).toBe('none');
    });
  });

  describe('Scenario 4: Disabled localStorage does not block game and shows no error', () => {
    test('should initialize without errors when localStorage is unavailable', () => {
      mockScoreManager.getBestScore.mockReturnValue(0);

      expect(() => game.init()).not.toThrow();
    });

    test('should display 0 as best score when localStorage is unavailable', () => {
      mockScoreManager.getBestScore.mockReturnValue(0);

      game.init();

      const display = document.getElementById('best-score-display');
      expect(display.textContent).toContain('0');
    });

    test('should allow gameplay to continue when localStorage is disabled', () => {
      mockScoreManager.getBestScore.mockReturnValue(0);
      mockScoreManager.submitScore.mockReturnValue({
        isNewBest: true,
        score: 750,
        previousBest: 0,
      });

      game.init();
      expect(() => game.endRound(750)).not.toThrow();
    });

    test('should not log errors to console when localStorage is disabled', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockScoreManager.getBestScore.mockReturnValue(0);
      mockScoreManager.submitScore.mockReturnValue({
        isNewBest: true,
        score: 750,
        previousBest: 0,
      });

      game.init();
      game.endRound(750);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should still show new best message when localStorage is disabled but a new best is achieved', () => {
      mockScoreManager.getBestScore.mockReturnValue(0);
      mockScoreManager.submitScore.mockReturnValue({
        isNewBest: true,
        score: 750,
        previousBest: 0,
      });

      game.init();
      game.endRound(750);

      const message = document.getElementById('new-best-message');
      expect(message.style.display).not.toBe('none');
      expect(message.classList.contains('visible')).toBe(true);
    });
  });
});
