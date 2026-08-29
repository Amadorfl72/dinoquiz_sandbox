/**
 * @typedef {Object} ScoreMetrics
 * @property {number} gamesCompleted
 * @property {number} totalScore
 * @property {number} averageScore
 */

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
 * @property {boolean} adsRemoved
 * @property {ScoreMetrics} scoreMetrics
 * @property {number} maxUnlockedLevel
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
  adsRemoved: false,
  scoreMetrics: { gamesCompleted: 0, totalScore: 0, averageScore: 0 },
  // Level 1 is always accessible (TRIOFSND-203), so it's the unlocked floor
  // even before any level has been completed.
  maxUnlockedLevel: 1,
};

/**
 * Schema version for the per-mode persisted state snapshot below
 * (TRIOFSND-297). Bump whenever `PersistedModeState`'s shape changes
 * incompatibly -- a stored snapshot under any other version must be
 * discarded by its validator/reader rather than migrated or guessed at
 * (mirrors GameSessionStorage.js's SESSION_SCHEMA_VERSION and
 * ModeProgressStorage.js's MODE_PROGRESS_SCHEMA_VERSION).
 * @type {number}
 */
const MODE_STATE_SCHEMA_VERSION = 1;

/**
 * Versioned, per-mode persisted-state snapshot (TRIOFSND-297, PRD "Definir e
 * implementar un contrato técnico común para todos los modos"): just enough
 * to identify and resume one mode's in-progress game -- which mode, which
 * level, which round it is on, and how many responses have been counted so
 * far. Deliberately excludes any creature-specific fact (diet, body length,
 * geologic period, ...): those are verified once per creature in the
 * creature sheet (src/data/creatureSheet.js) and must never be re-declared
 * here.
 * @typedef {Object} PersistedModeState
 * @property {number} schemaVersion
 * @property {string} modeId
 * @property {number} level
 * @property {number} currentRound
 * @property {number} answeredCount
 */

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

module.exports = { DEFAULT_STATE, MODE_STATE_SCHEMA_VERSION };
