'use strict';

const { createIndexedDbAdapter } = require('./adapters/indexedDbAdapter');
const { createLocalStorageAdapter } = require('./adapters/localStorageAdapter');
const { createMemoryAdapter } = require('./adapters/memoryAdapter');
const { LogService } = require('../logging');
const scoring = require('../../game/scoring');

const NAMESPACE = 'dinoquiz:';
const MODE_PROGRESS_KEY_PREFIX = `${NAMESPACE}modeProgress:`;

// Bump whenever the persisted shape below changes incompatibly. A stored
// entry under any other version is discarded rather than migrated/guessed,
// mirroring GameSessionStorage.js's SESSION_SCHEMA_VERSION.
const MODE_PROGRESS_SCHEMA_VERSION = 1;

// Every mode starts with its first level already accessible (mirrors
// StorageClient.js's DEFAULT_STATE.maxUnlockedLevel), independently per mode.
const DEFAULT_MAX_UNLOCKED_LEVEL = 1;

// Stable technical code for a degraded (in-memory-only) progress write,
// mirroring StorageClient.js's MAX_UNLOCKED_LEVEL_PERSIST_ERROR_CODE: carries
// no metadata beyond the mode id, so it never leaks a score/level.
const MODE_PROGRESS_PERSIST_ERROR_CODE = 'storage_mode_progress_persist_error';

// Stable technical code for discarding a corrupted/incompatible stored entry,
// mirroring GameSessionStorage.js's SESSION_DISCARD_INCOMPATIBLE_CODE.
const MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE = 'storage_mode_progress_discard_incompatible';

function modeProgressKey(modeId) {
  return `${MODE_PROGRESS_KEY_PREFIX}${modeId}`;
}

function isValidModeId(modeId) {
  return typeof modeId === 'string' && modeId.length > 0;
}

function isValidLastResult(result) {
  if (!result || typeof result !== 'object') {
    return false;
  }
  if (!Number.isInteger(result.score) || result.score < 0) {
    return false;
  }
  if (!Number.isInteger(result.maxScore) || result.maxScore <= 0 || result.score > result.maxScore) {
    return false;
  }
  if (!Number.isInteger(result.percentage) || result.percentage < 0 || result.percentage > 100) {
    return false;
  }
  if (!Number.isInteger(result.stars) || result.stars < 1 || result.stars > 3) {
    return false;
  }
  return result.level === null || Number.isInteger(result.level);
}

function isValidProgress(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (value.schemaVersion !== MODE_PROGRESS_SCHEMA_VERSION) {
    return false;
  }
  if (!Number.isInteger(value.maxUnlockedLevel) || value.maxUnlockedLevel < 1) {
    return false;
  }
  if (!Number.isInteger(value.unlockCount) || value.unlockCount < 0) {
    return false;
  }
  return value.lastResult === null || isValidLastResult(value.lastResult);
}

function defaultProgress() {
  return {
    schemaVersion: MODE_PROGRESS_SCHEMA_VERSION,
    maxUnlockedLevel: DEFAULT_MAX_UNLOCKED_LEVEL,
    unlockCount: 0,
    lastResult: null,
  };
}

/**
 * Per-mode local persistence of level progress, last result and unlock
 * counts (TRIOFSND-250, PRD "Progresión independiente por modo").
 *
 * Each mode gets its own namespaced key (`dinoquiz:modeProgress:<modeId>`),
 * so progress for one mode never reads, overwrites or resets another's --
 * unlike StorageClient.js's single, mode-agnostic `maxUnlockedLevel`, this
 * is designed for the eight independently-progressing modes from the start.
 *
 * `recordLevelUnlocked` is monotonic per mode (mirrors StorageClient.js's
 * `setMaxUnlockedLevel`): replaying an already-cleared level recomputes the
 * same already-unlocked next level, which is never greater than the stored
 * `maxUnlockedLevel`, so it is a no-op and `unlockCount` -- incremented only
 * on a genuine advance -- is never double-counted.
 *
 * Backend fallback (IndexedDB -> localStorage -> memory) mirrors
 * StorageClient.js/GameSessionStorage.js so a mode stays playable, just
 * non-persistent, when every durable backend is unavailable.
 */
class ModeProgressStorage {
  #adapters;
  #activeAdapter = null;
  #initPromise = null;
  #logService;

  // Aggregated, non-PII observability counters only (mirrors StorageClient.js).
  #failureCount = 0;
  #lastErrorAt = null;

  constructor(
    adapters = [createIndexedDbAdapter(), createLocalStorageAdapter(), createMemoryAdapter()],
    logService = new LogService()
  ) {
    this.#adapters = adapters;
    this.#logService = logService;
  }

  init() {
    if (!this.#initPromise) {
      this.#initPromise = this.#doInit();
    }
    return this.#initPromise;
  }

  async #doInit() {
    for (const adapter of this.#adapters) {
      try {
        if (await adapter.isAvailable()) {
          this.#activeAdapter = adapter;
          return;
        }
      } catch {
        this.#recordFailure();
      }
    }
    this.#activeAdapter = createMemoryAdapter();
  }

  #recordFailure() {
    this.#failureCount += 1;
    this.#lastErrorAt = Date.now();
  }

  /** Same degrade-on-failure write shape as GameSessionStorage.js#write. */
  async #write(modeId, value) {
    await this.init();

    const activeIndex = this.#activeAdapter ? this.#adapters.indexOf(this.#activeAdapter) : -1;
    const candidates = this.#adapters.slice(Math.max(activeIndex, 0));

    for (const adapter of candidates) {
      try {
        if (adapter !== this.#activeAdapter && !(await adapter.isAvailable())) {
          continue;
        }
        await adapter.setItem(modeProgressKey(modeId), JSON.stringify(value));
        this.#activeAdapter = adapter;
        return true;
      } catch {
        this.#recordFailure();
      }
    }

    this.#activeAdapter = createMemoryAdapter();
    return false;
  }

  async #readRaw(modeId) {
    await this.init();
    try {
      return await this.#activeAdapter.getItem(modeProgressKey(modeId));
    } catch {
      this.#recordFailure();
      return null;
    }
  }

  /**
   * Resolves to `modeId`'s stored progress, or the default (level 1
   * unlocked, no unlocks yet, no last result) when nothing was ever saved.
   * A corrupted or incompatible-schema entry is discarded (never guessed at
   * or migrated) and logged via the aggregated, data-free
   * `MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE` counter, mirroring
   * GameSessionStorage.js#restoreSession.
   */
  async getProgress(modeId) {
    if (!isValidModeId(modeId)) {
      return defaultProgress();
    }

    const raw = await this.#readRaw(modeId);
    if (raw === null) {
      return defaultProgress();
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Falls through to the discard-and-default path below.
    }

    if (!isValidProgress(parsed)) {
      this.#logService.logStateDiscarded(modeId, MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE);
      return defaultProgress();
    }

    return parsed;
  }

  /** Highest level (1-based) unlocked for `modeId` on this device so far. */
  async getMaxUnlockedLevel(modeId) {
    const progress = await this.getProgress(modeId);
    return progress.maxUnlockedLevel;
  }

  /** Count of distinct levels unlocked for `modeId` on this device so far. */
  async getUnlockCount(modeId) {
    const progress = await this.getProgress(modeId);
    return progress.unlockCount;
  }

  /** `modeId`'s most recently persisted result, or null if it has never finished a game. */
  async getLastResult(modeId) {
    const progress = await this.getProgress(modeId);
    return progress.lastResult;
  }

  /**
   * Advances `modeId`'s unlocked level and its unlock counter, but only when
   * `level` is a genuine advance past what is already unlocked -- monotonic,
   * exactly mirroring StorageClient.js#setMaxUnlockedLevel. Replaying a
   * cleared level re-proposes a `level` that is never greater than the
   * current `maxUnlockedLevel`, so this is a no-op and `unlockCount` cannot
   * be double-counted.
   */
  async recordLevelUnlocked(modeId, level) {
    if (!isValidModeId(modeId) || !Number.isInteger(level)) {
      return this.getProgress(modeId);
    }

    const current = await this.getProgress(modeId);
    if (level <= current.maxUnlockedLevel) {
      return current;
    }

    const updated = { ...current, maxUnlockedLevel: level, unlockCount: current.unlockCount + 1 };
    const persisted = await this.#write(modeId, updated);
    if (!persisted) {
      this.#logService.logEvent(MODE_PROGRESS_PERSIST_ERROR_CODE);
    }
    return updated;
  }

  /**
   * Persists `modeId`'s latest finished-game result: `score`/`maxScore` plus
   * the shared 0-100 percentage/1-3 star tier derived from them via
   * scoring.js's `normalizeOutcome` (TRIOFSND-251), so every mode's result
   * lands on the same scale regardless of its own scoring representation.
   * `level` is optional (not every mode has a level chain) and stored as-is.
   * Always overwrites the previous result -- only the latest game's outcome
   * is kept, never a history of past results.
   */
  async recordResult(modeId, { score, maxScore, level = null } = {}) {
    if (!isValidModeId(modeId)) {
      return null;
    }

    const { percentage, stars } = scoring.normalizeOutcome(score, maxScore);
    const lastResult = { score, maxScore, percentage, stars, level };

    const current = await this.getProgress(modeId);
    const updated = { ...current, lastResult };
    const persisted = await this.#write(modeId, updated);
    if (!persisted) {
      this.#logService.logEvent(MODE_PROGRESS_PERSIST_ERROR_CODE);
    }
    return lastResult;
  }

  getDiagnostics() {
    return {
      backend: this.#activeAdapter?.name ?? 'memory',
      isPersistent: (this.#activeAdapter?.name ?? 'memory') !== 'memory',
      failureCount: this.#failureCount,
      lastErrorAt: this.#lastErrorAt,
    };
  }
}

module.exports = {
  ModeProgressStorage,
  MODE_PROGRESS_SCHEMA_VERSION,
  MODE_PROGRESS_KEY_PREFIX,
  MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE,
};
