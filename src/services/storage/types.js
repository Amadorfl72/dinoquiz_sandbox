/**
 * @typedef {Object} DinoQuizDeviceInfo
 * @property {string} os
 * @property {string} osVersion
 * @property {string} deviceClass
 * @property {string} locale
 * @property {string} userAgent
 * @property {number} screenWidth
 * @property {number} screenHeight
 * @property {number} pixelRatio
 */

/**
 * Anonymous crash event (TRIOFSND-143): no user identifiers, no full stack
 * trace -- see src/services/deviceCompat.js#createErrorCrashEvent /
 * #createRejectionCrashEvent.
 * @typedef {Object} DinoQuizCrashEvent
 * @property {'error' | 'unhandledrejection'} type
 * @property {string} message
 * @property {string} source
 * @property {number | null} line
 * @property {number | null} column
 * @property {number} timestamp
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
 * @property {DinoQuizDeviceInfo | null} deviceInfo
 * @property {DinoQuizCrashEvent[]} crashLog
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
  deviceInfo: null,
  crashLog: [],
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
