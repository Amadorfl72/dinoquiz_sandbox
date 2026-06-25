/**
 * gameState.js
 * Central game state manager for DinoQuiz.
 * Handles state transitions, score tracking, and best-score persistence.
 */

const BEST_SCORE_KEY = 'dinoquiz_best_score';
const TOTAL_QUESTIONS_PER_GAME = 10;

/**
 * Creates a fresh game state object.
 * @returns {Object} A new game state with zeroed score and empty question list.
 */
function createInitialState() {
  return {
    phase: 'idle',          // 'idle' | 'playing' | 'fact' | 'results'
    questions: [],           // Array of selected question objects (shuffled options)
    currentIndex: 0,         // Index of the current question (0-9)
    score: 0,                // Number of correct answers
    answered: [],            // Array of { questionId, selectedOption, isCorrect }
    sessionStartTime: null,  // Timestamp when game started
    questionStartTime: null, // Timestamp when current question was shown
  };
}

/**
 * GameState singleton — holds the current game session.
 * On app load, state is always fresh (no partial game restoration per AC-18).
 */
const GameState = {
  _state: createInitialState(),

  /**
   * Returns the current state (read-only view).
   * @returns {Object}
   */
  get() {
    return this._state;
  },

  /**
   * Resets all game state to initial values.
   * Called when starting a new game or replaying.
   */
  reset() {
    this._state = createInitialState();
  },

  /**
   * Loads a new set of questions into state and transitions to 'playing'.
   * @param {Array} questions - Array of 10 question objects with shuffled options.
   */
  startGame(questions) {
    this._state = createInitialState();
    this._state.questions = questions;
    this._state.phase = 'playing';
    this._state.sessionStartTime = Date.now();
    this._state.questionStartTime = Date.now();
  },

  /**
   * Records an answer and advances internal counters.
   * @param {string} questionId
   * @param {number} selectedOption - Index of the selected option.
   * @param {boolean} isCorrect
   */
  recordAnswer(questionId, selectedOption, isCorrect) {
    this._state.answered.push({ questionId, selectedOption, isCorrect });
    if (isCorrect) {
      this._state.score++;
    }
  },

  /**
   * Advances to the next question or transitions to results.
   * @returns {string} The new phase: 'playing' or 'results'.
   */
  nextQuestion() {
    this._state.currentIndex++;
    this._state.questionStartTime = Date.now();
    if (this._state.currentIndex >= this._state.questions.length) {
      this._state.phase = 'results';
      return 'results';
    }
    this._state.phase = 'playing';
    return 'playing';
  },

  /**
   * Sets the current phase.
   * @param {string} phase
   */
  setPhase(phase) {
    this._state.phase = phase;
  },

  /**
   * Returns the current question object or null.
   * @returns {Object|null}
   */
  getCurrentQuestion() {
    if (this._state.currentIndex >= this._state.questions.length) return null;
    return this._state.questions[this._state.currentIndex];
  },

  /**
   * Returns the current score.
   * @returns {number}
   */
  getScore() {
    return this._state.score;
  },

  /**
   * Returns the total number of questions in the game.
   * @returns {number}
   */
  getTotalQuestions() {
    return TOTAL_QUESTIONS_PER_GAME;
  },

  /**
   * Retrieves the best score from localStorage.
   * Handles storage failures gracefully (AC-9, AC-10, alternative_workflows).
   * @returns {number|null} Best score or null if unavailable.
   */
  getBestScore() {
    try {
      const raw = localStorage.getItem(BEST_SCORE_KEY);
      if (raw === null) return null;
      const parsed = parseInt(raw, 10);
      return Number.isNaN(parsed) ? null : parsed;
    } catch (e) {
      // localStorage may be disabled or full — degrade gracefully
      console.warn('[DinoQuiz] Could not read best score from localStorage:', e);
      return null;
    }
  },

  /**
   * Saves the best score to localStorage if the new score is higher.
   * @param {number} score
   * @returns {boolean} True if a new best score was saved.
   */
  saveBestScore(score) {
    try {
      const currentBest = this.getBestScore();
      if (currentBest === null || score > currentBest) {
        localStorage.setItem(BEST_SCORE_KEY, String(score));
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[DinoQuiz] Could not save best score to localStorage:', e);
      return false;
    }
  },
};

export { GameState, TOTAL_QUESTIONS_PER_GAME };
