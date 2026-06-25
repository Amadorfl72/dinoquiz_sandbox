/**
 * Structured telemetry event definitions for DinoQuiz.
 * All events are anonymous, aggregated, and contain no PII.
 * Common fields (added by the transport layer): app_version, locale, timestamp.
 */

export const EVENT_TYPES = {
  GAME_STARTED: 'game_started',
  QUESTION_ANSWERED: 'question_answered',
  FUN_FACT_VIEWED: 'fun_fact_viewed',
  GAME_COMPLETED: 'game_completed',
  REPLAY_CLICKED: 'replay_clicked',
  BEST_SCORE_UPDATED: 'best_score_updated',
};

/**
 * Build a 'replay_clicked' event payload.
 * @param {number} previousScore - The score of the just-completed game (0-10).
 * @param {number} [timestamp] - Optional override; defaults to Date.now().
 * @returns {{event: string, previous_score: number, timestamp: number}}
 */
export function buildReplayClickedEvent(previousScore, timestamp = Date.now()) {
  if (typeof previousScore !== 'number' || Number.isNaN(previousScore)) {
    previousScore = 0;
  }
  return {
    event: EVENT_TYPES.REPLAY_CLICKED,
    previous_score: previousScore,
    timestamp: timestamp,
  };
}

/**
 * Build a 'game_started' event payload.
 * @param {'initial'|'replay'} trigger - What triggered the game start.
 * @returns {{event: string, trigger: string}}
 */
export function buildGameStartedEvent(trigger = 'initial') {
  return {
    event: EVENT_TYPES.GAME_STARTED,
    trigger: trigger === 'replay' ? 'replay' : 'initial',
  };
}

/**
 * Build a 'game_completed' event payload.
 * @param {number} score - Final score (0-10).
 * @returns {{event: string, score: number}}
 */
export function buildGameCompletedEvent(score) {
  return {
    event: EVENT_TYPES.GAME_COMPLETED,
    score: typeof score === 'number' ? score : 0,
  };
}
