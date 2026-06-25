// tests/test_replay_telemetry.js
import GameController from '../src/game/GameController.js';
import * as events from '../src/telemetry/events.js';
import * as metrics from '../src/telemetry/metrics.js';

// Mock gtag
window.gtag = jest.fn();

describe('Replay Telemetry', () => {
  let gameController;
  
  beforeEach(() => {
    gameController = new GameController();
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('emits game_started with replay trigger on restart', () => {
    gameController.restartGame(7);
    
    expect(window.gtag).toHaveBeenCalledWith('event', 'game_started', {
      trigger: 'replay'
    });
  });

  test('emits replay_clicked with previous_score and timestamp', () => {
    const previousScore = 8;
    const before = Date.now();
    gameController.restartGame(previousScore);
    const after = Date.now();
    
    expect(window.gtag).toHaveBeenCalledWith('event', 'replay_clicked', {
      previous_score: previousScore,
      timestamp: expect.toBeWithinRange(before, after)
    });
  });

  test('calculates replay rate metric correctly for replays under 5 minutes', () => {
    // Set a game over time 2 minutes ago
    const gameOverTime = Date.now() - (2 * 60 * 1000);
    localStorage.setItem('lastGameOverTime', gameOverTime);
    
    gameController.restartGame(5);
    
    // Should emit replay_rate_under_5min event
    expect(window.gtag).toHaveBeenCalledWith('event', 'replay_rate_under_5min', {
      value: 1
    });
  });

  test('does not count replay rate for replays over 5 minutes', () => {
    // Set a game over time 10 minutes ago
    const gameOverTime = Date.now() - (10 * 60 * 1000);
    localStorage.setItem('lastGameOverTime', gameOverTime);
    
    gameController.restartGame(5);
    
    // Should NOT emit replay_rate_under_5min event
    expect(window.gtag).not.toHaveBeenCalledWith('event', 'replay_rate_under_5min', expect.anything());
  });
});

// Custom matcher for timestamp range check
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});