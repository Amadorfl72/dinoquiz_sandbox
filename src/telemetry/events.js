/**
 * Centralized definition of telemetry event names and their expected schemas.
 * Keeping this in one place ensures consistency across the codebase and
 * makes it easy to audit which events exist and what fields they carry.
 *
 * Privacy note: No PII, no device IDs, no IPs. Only anonymous, aggregated
 * product events as described in the PRD logging_observability section.
 */

export const EVENT_NAMES = Object.freeze({
  GAME_STARTED: 'game_started',
  QUESTION_ANSWERED: 'question_answered',
  FUN_FACT_VIEWED: 'fun_fact_viewed',
  GAME_COMPLETED: 'game_completed',
  REPLAY_CLICKED: 'replay_clicked',
  BEST_SCORE_UPDATED: 'best_score_updated',
});

/**
 * Schema descriptors for documentation and optional runtime validation.
 * Each entry lists the required fields for the event payload.
 */
export const EVENT_SCHEMAS = Object.freeze({
  [EVENT_NAMES.GAME_STARTED]: {
    required: ['trigger'],
    optional: ['app_version', 'locale', 'timestamp'],
  },
  [EVENT_NAMES.QUESTION_ANSWERED]: {
    required: ['is_correct'],
    optional: ['question_id', 'app_version', 'locale', 'timestamp'],
  },
  [EVENT_NAMES.FUN_FACT_VIEWED]: {
    required: [],
    optional: ['question_id', 'app_version', 'locale', 'timestamp'],
  },
  [EVENT_NAMES.GAME_COMPLETED]: {
    required: ['score'],
    optional: ['app_version', 'locale', 'timestamp'],
  },
  [EVENT_NAMES.REPLAY_CLICKED]: {
    required: ['previous_score', 'timestamp'],
    optional: ['app_version', 'locale'],
  },
  [EVENT_NAMES.BEST_SCORE_UPDATED]: {
    required: ['new_best', 'previous_best'],
    optional: ['app_version', 'locale', 'timestamp'],
  },
});

/**
 * Values for the `trigger` field on `game_started`.
 */
export const GAME_START_TRIGGERS = Object.freeze({
  INITIAL: 'initial',
  REPLAY: 'replay',
});
