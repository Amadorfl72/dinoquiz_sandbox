/**
 * resultsScreen.test.js
 * Unit tests for the 'Volver a jugar' handler (TRIOFSND-39).
 */

import { handleReplay, getMotivationalMessage } from '../resultsScreen.js';
import { GameState } from '../../gameState.js';

// Mock question pool with 30 questions
function createMockPool(count = 30) {
  return Array.from({ length: count }, (_, i) => ({
    id: `q${i}`,
    statement: `Question ${i}?`,
    options: ['Option A', 'Option B', 'Option C'],
    correctAnswer: i % 3,
    dinosaurId: `dino${i}`,
    dinosaurName: `Dinosaur ${i}`,
    dinosaurImage: `dino${i}.png`,
    funFact: `Fun fact ${i}`,
  }));
}

// Mock UI
function createMockUI() {
  let lastRendered = null;
  return {
    _container: { innerHTML: '' },
    getScreenContainer() {
      return this._container;
    },
    getAssetUrl(path) {
      return `./assets/${path}`;
    },
    playSound() {},
    showStartScreen() {
      lastRendered = 'start';
    },
    showFunFactScreen() {
      lastRendered = 'fact';
    },
    _lastRendered: () => lastRendered,
  };
}

describe('handleReplay', () => {
  beforeEach(() => {
    GameState.reset();
  });

  test('resets game state and starts a new game with 10 questions', () => {
    const pool = createMockPool();
    const mockUI = createMockUI();

    // Simulate a completed game with score 7
    GameState.startGame(pool.slice(0, 10));
    GameState.recordAnswer('q0', 0, true);
    GameState.setPhase('results');

    expect(GameState.getScore()).toBe(1);
    expect(GameState.get().phase).toBe('results');

    // Call replay handler
    handleReplay(pool, mockUI);

    // State should be reset and new game started
    expect(GameState.getScore()).toBe(0);
    expect(GameState.get().phase).toBe('playing');
    expect(GameState.get().questions).toHaveLength(10);
    expect(GameState.get().currentIndex).toBe(0);
  });

  test('selects a different set of questions than the previous game (probabilistic)', () => {
    const pool = createMockPool();
    const mockUI = createMockUI();

    // First game
    handleReplay(pool, mockUI);
    const firstSet = GameState.get().questions.map((q) => q.id);

    // Second game (replay)
    handleReplay(pool, mockUI);
    const secondSet = GameState.get().questions.map((q) => q.id);

    // With 30 questions and 10 selected, the sets should almost certainly differ
    // (probability of identical sets is 1/C(30,10) ≈ 1/3M)
    expect(firstSet).not.toEqual(secondSet);
  });

  test('shuffles answer options (correct answer index varies)', () => {
    const pool = createMockPool();
    const mockUI = createMockUI();

    handleReplay(pool, mockUI);

    const questions = GameState.get().questions;
    // In the mock pool, correctAnswer is always i%3 (0, 1, or 2).
    // After shuffling, at least some should differ from the original pattern.
    const hasVaried = questions.some(
      (q, idx) => q.correctAnswer !== idx % 3
    );
    // Very high probability that at least one option order changed
    expect(hasVaried).toBe(true);
  });

  test('completes in under 2 seconds', () => {
    const pool = createMockPool();
    const mockUI = createMockUI();

    const start = performance.now();
    handleReplay(pool, mockUI);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });

  test('handles empty question pool gracefully', () => {
    const mockUI = createMockUI();

    expect(() => handleReplay([], mockUI)).not.toThrow();
    // Should fall back to start screen
    expect(mockUI._lastRendered()).toBe('start');
  });
});

describe('getMotivationalMessage', () => {
  test('returns appropriate message for each score range', () => {
    expect(getMotivationalMessage(0)).toContain('practicando');
    expect(getMotivationalMessage(3)).toContain('practicando');
    expect(getMotivationalMessage(4)).toContain('Bien hecho');
    expect(getMotivationalMessage(6)).toContain('Bien hecho');
    expect(getMotivationalMessage(7)).toContain('Genial');
    expect(getMotivationalMessage(8)).toContain('Genial');
    expect(getMotivationalMessage(9)).toContain('Increíble');
    expect(getMotivationalMessage(10)).toContain('Increíble');
  });
});
