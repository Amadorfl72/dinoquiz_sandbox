/**
 * GameController — orchestrates the game lifecycle.
 *
 * TRIOFSND-41 instrumentation:
 *  - When a game starts via the initial "¡Jugar!" button, emit `game_started`
 *    with `trigger: 'initial'`.
 *  - When a game starts via "Volver a jugar" (replay), emit `game_started`
 *    with `trigger: 'replay'`.
 *  - When a game completes, call recordGameCompleted so the replay-rate
 *    metric can be computed later.
 */

import { recordGameStartedInitial, recordGameStartedReplay, recordGameCompleted } from '../telemetry/replayTelemetry.js';
import { GAME_START_TRIGGERS } from '../telemetry/events.js';

export class GameController {
  constructor({ questionsPool, onStateChange } = {}) {
    this.questionsPool = questionsPool || [];
    this.onStateChange = onStateChange || (() => {});
    this._currentGame = null;
  }

  /**
   * Start a new game.
   *
   * @param {object} options
   * @param {string} options.trigger - 'initial' or 'replay'
   */  startGame({ trigger = GAME_START_TRIGGERS.INITIAL } = {}) {
    try {
      // Emit the appropriate game_started event.
      if (trigger === GAME_START_TRIGGERS.REPLAY) {
        recordGameStartedReplay();
      } else {
        recordGameStartedInitial();
      }
    } catch (err) {
      console.error('[GameController] telemetry error on startGame:', err);
    }

    // Select 10 random questions without repetition.
    const selected = this._selectRandomQuestions(10);

    this._currentGame = {
      questions: selected,
      currentIndex: 0,
      score: 0,
      startedAt: Date.now(),
      trigger,
    };

    this.onStateChange({
      phase: 'question',
      question: selected[0],
      questionIndex: 0,
      totalQuestions: selected.length,
      score: 0,
    });
  }

  /**
   * Convenience: start a replay game.
   */
  startReplay() {
    this.startGame({ trigger: GAME_START_TRIGGERS.REPLAY });
  }

  /**
   * Record an answer and advance.
   */
  answerQuestion(selectedIndex) {
    if (!this._currentGame) return;

    const current = this._currentGame.questions[this._currentGame.currentIndex];
    const isCorrect = selectedIndex === current.correctIndex;

    if (isCorrect) {
      this._currentGame.score += 1;
    }

    this.onStateChange({
      phase: 'fun_fact',
      question: current,
      isCorrect,
      score: this._currentGame.score,
      questionIndex: this._currentGame.currentIndex,
      totalQuestions: this._currentGame.questions.length,
    });
  }

  /**
   * Advance to the next question or complete the game.
   */
  next() {
    if (!this._currentGame) return;

    this._currentGame.currentIndex += 1;

    if (this._currentGame.currentIndex >= this._currentGame.questions.length) {
      this._completeGame();
      return;
    }

    const idx = this._currentGame.currentIndex;
    this.onStateChange({
      phase: 'question',
      question: this._currentGame.questions[idx],
      questionIndex: idx,
      totalQuestions: this._currentGame.questions.length,
      score: this._currentGame.score,
    });
  }

  /**
   * Complete the current game and emit telemetry.
   */
  _completeGame() {
    const score = this._currentGame ? this._currentGame.score : 0;

    try {
      // Record completion so replay-rate metric can be computed.
      recordGameCompleted(score, Date.now());
    } catch (err) {
      console.error('[GameController] telemetry error on completeGame:', err);
    }

    this.onStateChange({
      phase: 'results',
      score,
      totalQuestions: this._currentGame.questions.length,
      trigger: this._currentGame.trigger,
    });
  }

  /**
   * Select N random questions from the pool without repetition.
   */
  _selectRandomQuestions(n) {
    const pool = [...this.questionsPool];
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(n, pool.length));
  }

  getCurrentScore() {
    return this._currentGame ? this._currentGame.score : 0;
  }
}
