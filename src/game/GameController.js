import { handleReplayGameStart, handleGameOver } from '../telemetry/replayTelemetry.js';
import { buildGameStartedEvent } from '../telemetry/events.js';
import { trackEvent } from '../telemetry/transport.js';

/**
 * GameController manages the lifecycle of a quiz game session.
 *
 * Telemetry responsibilities:
 *   - On startNewGame({ trigger: 'replay' }): emit 'game_started' with trigger:'replay'.
 *   - On startNewGame({ trigger: 'initial' }) or default: emit 'game_started' with trigger:'initial'.
 *   - On gameComplete(): emit 'game_completed' and record game_over for replay-rate metric.
 */
export default class GameController {
  constructor({ questions, onStateChange } = {}) {
    this.questions = questions || [];
    this.onStateChange = onStateChange || (() => {});
    this.currentIndex = 0;
    this.score = 0;
    this.activeQuestions = [];
    this.isComplete = false;
  }

  /**
   * Start a new game.
   * @param {{trigger?: 'initial'|'replay'}} [opts]
   */
  startNewGame(opts = {}) {
    const trigger = opts.trigger === 'replay' ? 'replay' : 'initial';

    try {
      if (trigger === 'replay') {
        // Emit 'game_started' with trigger:'replay' via replay telemetry orchestrator.
        handleReplayGameStart();
      } else {
        // Emit 'game_started' with trigger:'initial'.
        trackEvent(buildGameStartedEvent('initial'));
      }
    } catch {
      // Swallow - telemetry must never block game start.
    }

    // Select 10 random questions without repetition.
    this.activeQuestions = this._pickRandomQuestions(10);
    this.currentIndex = 0;
    this.score = 0;
    this.isComplete = false;
    this.onStateChange(this.getState());
  }

  /**
   * Called when the game finishes (all 10 questions answered).
   * @param {number} finalScore
   */
  gameComplete(finalScore) {
    this.score = finalScore;
    this.isComplete = true;

    try {
      // Record game_over timestamp for replay-rate metric calculation.
      handleGameOver();
    } catch {
      // Swallow.
    }

    this.onStateChange(this.getState());
  }

  getState() {
    return {
      currentIndex: this.currentIndex,
      score: this.score,
      isComplete: this.isComplete,
      totalQuestions: this.activeQuestions.length,
      currentQuestion: this.activeQuestions[this.currentIndex] || null,
    };
  }

  /**
   * Pick N random questions from the pool without repetition.
   * @param {number} n
   * @returns {Array}
   * @private
   */
  _pickRandomQuestions(n) {
    const pool = [...this.questions];
    const picked = [];
    const count = Math.min(n, pool.length);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }
}
