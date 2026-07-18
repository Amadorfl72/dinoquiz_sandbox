/**
 * @typedef {Object} QuestionStats
 * @property {number} total_respuestas
 * @property {number} total_aciertos
 */

/**
 * Minimal, non-PII local event (TRIOFSND-80): no name/age/email/ad-or-install
 * id/free text/IP/device data, ever -- just which question and whether it
 * was a hit.
 * @typedef {Object} QuestionAnsweredEvent
 * @property {'pregunta_respondida'} tipo
 * @property {string} id_pregunta
 * @property {boolean} acierto
 */

/**
 * @typedef {Object} DinoQuizPersistedState
 * @property {number} bestScore
 * @property {number} maxStreak
 * @property {string[]} discoveredFunFacts
 * @property {boolean} muted
 * @property {boolean} homeTooltipSeen
 * @property {Object.<string, number>} analyticsEventCounts
 * @property {Object.<string, QuestionStats>} questionStats
 * @property {QuestionAnsweredEvent[]} questionAnsweredEvents
 */

/** @type {DinoQuizPersistedState} */
const DEFAULT_STATE = {
  bestScore: 0,
  maxStreak: 0,
  discoveredFunFacts: [],
  muted: false,
  homeTooltipSeen: false,
  analyticsEventCounts: {},
  questionStats: {},
  questionAnsweredEvents: [],
};

/**
 * @typedef {'indexedDB' | 'localStorage' | 'memory'} StorageBackendName
 */

/**
 * @typedef {Object} StorageAdapter
 * @property {StorageBackendName} name
 * @property {() => Promise<boolean>} isAvailable
 * @property {(key: string) => Promise<string | null>} getItem
 * @property {(key: string, value: string) => Promise<void>} setItem
 * @property {(key: string) => Promise<void>} removeItem
 */

/**
 * Aggregated, non-PII diagnostics only: no user identifiers, no stack traces.
 * @typedef {Object} StorageDiagnostics
 * @property {StorageBackendName} backend
 * @property {boolean} isPersistent
 * @property {number} failureCount
 * @property {number | null} lastErrorAt
 */

module.exports = { DEFAULT_STATE };
