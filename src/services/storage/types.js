/**
 * @typedef {Object} ScoreMetrics
 * @property {number} gamesCompleted
 * @property {number} totalScore
 * @property {number} averageScore
 */

/**
 * @typedef {Object} DinoQuizPersistedState
 * @property {number} bestScore
 * @property {number} maxStreak
 * @property {string[]} discoveredFunFacts
 * @property {boolean} muted
 * @property {boolean} homeTooltipSeen
 * @property {Object.<string, number>} analyticsEventCounts
 * @property {boolean} adsRemoved
 * @property {ScoreMetrics} scoreMetrics
 */

/** @type {DinoQuizPersistedState} */
const DEFAULT_STATE = {
  bestScore: 0,
  maxStreak: 0,
  discoveredFunFacts: [],
  muted: false,
  homeTooltipSeen: false,
  analyticsEventCounts: {},
  adsRemoved: false,
  scoreMetrics: { gamesCompleted: 0, totalScore: 0, averageScore: 0 },
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
