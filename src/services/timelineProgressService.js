'use strict';

const { createIndexedDbAdapter } = require('./storage/adapters/indexedDbAdapter');
const { createLocalStorageAdapter } = require('./storage/adapters/localStorageAdapter');
const { createMemoryAdapter } = require('./storage/adapters/memoryAdapter');
const { LogService } = require('./logging');
const gameFlow = require('../game/gameFlow');
const scoring = require('../game/scoring');
const unlockThresholds = require('../game/unlockThresholds');
const { MODE_IDS } = require('../game/modesCatalog');

/**
 * Local, independent persistence of the Línea del tiempo mode's own
 * progression (TRIOFSND-294, PRD "Progresión independiente por modo"):
 * highest unlocked level, aciertos and estrellas of the last finished game.
 *
 * Unlike src/services/storage/ModeProgressStorage.js's shared, generic
 * `dinoquiz:modeProgress:<modeId>` key -- which every mode already gets for
 * free -- this stores Timeline's own record under its own namespace,
 * `dinoquiz:timeline:*`, exactly the same "one mode, one dedicated
 * namespace" precedent public/scripts/oidoJurasicoScreen.js's own
 * `dinoquiz:oidoJurasico:introSeen` flag already set. `MODE_ID` (the mode id
 * this whole module is scoped to, `modesCatalog.MODE_IDS.LINEA_DEL_TIEMPO`)
 * is baked in rather than accepted as a parameter, so a caller can never
 * accidentally read or write a different mode's progress through this file.
 *
 * Restauración (AC "restauración"): `getProgress` is the read path every
 * other method composes with -- a corrupted or schema-incompatible stored
 * entry is discarded (never guessed at or migrated, mirrors
 * ModeProgressStorage.js#getProgress/GameSessionStorage.js#restoreSession)
 * and this device simply restarts at the default (level 1, no result yet)
 * instead of crashing or resuming into garbage.
 *
 * Unlock threshold (AC "evaluar el umbral de desbloqueo del modo sin
 * afectar a otros modos"): `recordGameFinished` decides whether a level's
 * aciertos unlock the next one via `gameFlow.resolveLevelOutcome`, scoped to
 * `MODE_ID` -- the exact same shared contract function
 * src/game/timelineRound.js's own `completeLevel` drives live gameplay
 * with (TRIOFSND-294), so a finished game's persisted outcome always agrees
 * with what the player actually saw. `unlockThresholds.js`'s per-mode table
 * means this can never read or affect any other mode's threshold.
 *
 * Diagnóstico local existente (AC "agregar los contadores locales de
 * partidas/aciertos del modo"): `recordGameStarted`/`recordGameAbandoned`/
 * `recordGameFinished` tally Timeline's own numbers into logging.js's
 * already-existing, generic per-"modeId:level" counters
 * (`logRoundGameStarted`/`logRoundGameCompleted`/`logRoundGameAbandoned`/
 * `logRoundCorrectAnswer`/`logRoundStarsEarned`, TRIOFSND-246/277) instead of
 * declaring a parallel, Timeline-only set -- the same choice logging.js's
 * own doc comment documents for Parejas/Oído Jurásico ("just another modeId
 * through that same family").
 *
 * Resultados común (AC "conectarlo a la pantalla común de resultados"):
 * `recordGameFinished` derives percentage/estrellas via `scoring.js`'s
 * shared `normalizeOutcome(score, maxScore)` -- the exact function
 * resultsScreen.js/ModeProgressStorage.js already use for every other mode
 * -- so Timeline's stored result is shaped identically to what "Resultados"
 * already renders (porcentaje sobre 10 rondas, estrellas).
 *
 * Backend fallback (IndexedDB -> localStorage -> memory) and the class shape
 * mirror src/services/storage/GameSessionStorage.js, the closest existing
 * precedent for a `src/services/` storage module with no `public/scripts/`
 * browser twin yet.
 */

const MODE_ID = MODE_IDS.LINEA_DEL_TIEMPO;
const NAMESPACE = 'dinoquiz:timeline:';
const PROGRESS_KEY = `${NAMESPACE}progress`;

// Bump whenever the persisted shape below changes incompatibly -- a stored
// entry under any other version is discarded rather than migrated/guessed
// (mirrors ModeProgressStorage.js's own MODE_PROGRESS_SCHEMA_VERSION).
const PROGRESS_SCHEMA_VERSION = 1;

// Timeline's first level is always accessible, independently of every other
// mode's own progress (mirrors ModeProgressStorage.js's DEFAULT_MAX_UNLOCKED_LEVEL).
const DEFAULT_MAX_UNLOCKED_LEVEL = 1;

// Stable technical codes, never any round content -- mirror ModeProgressStorage.js's
// own PERSIST/DISCARD error codes, namespaced to this mode's own store.
const PROGRESS_PERSIST_ERROR_CODE = 'storage_timeline_progress_persist_error';
const PROGRESS_DISCARD_INCOMPATIBLE_CODE = 'storage_timeline_progress_discard_incompatible';

function defaultProgress() {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    maxUnlockedLevel: DEFAULT_MAX_UNLOCKED_LEVEL,
    unlockCount: 0,
    lastResult: null,
  };
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
  if (value.schemaVersion !== PROGRESS_SCHEMA_VERSION) {
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

/** Aciertos among `answers` (e.g. a finished level's `gameState.answers`) -- mirrors gameFlow.js's own `countCorrectAnswers`. */
function countCorrectAnswers(answers) {
  if (!Array.isArray(answers)) {
    return 0;
  }
  return answers.reduce((count, answer) => count + (answer && answer.isCorrect ? 1 : 0), 0);
}

function defaultAdapters() {
  return [createIndexedDbAdapter(), createLocalStorageAdapter(), createMemoryAdapter()];
}

class TimelineProgressService {
  #adapters;
  #logService;
  #activeAdapter = null;
  #initPromise = null;

  // Aggregated, non-PII observability counters only (mirrors GameSessionStorage.js).
  #failureCount = 0;
  #lastErrorAt = null;

  constructor(adapters = defaultAdapters(), logService = new LogService()) {
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

  async #write(value) {
    await this.init();

    const activeIndex = this.#activeAdapter ? this.#adapters.indexOf(this.#activeAdapter) : -1;
    const candidates = this.#adapters.slice(Math.max(activeIndex, 0));

    for (const adapter of candidates) {
      try {
        if (adapter !== this.#activeAdapter && !(await adapter.isAvailable())) {
          continue;
        }
        await adapter.setItem(PROGRESS_KEY, JSON.stringify(value));
        this.#activeAdapter = adapter;
        return true;
      } catch {
        this.#recordFailure();
      }
    }

    this.#activeAdapter = createMemoryAdapter();
    return false;
  }

  async #readRaw() {
    await this.init();
    try {
      return await this.#activeAdapter.getItem(PROGRESS_KEY);
    } catch {
      this.#recordFailure();
      return null;
    }
  }

  /**
   * This device's Timeline progress -- `maxUnlockedLevel`, `unlockCount` and
   * the last finished game's `lastResult` (score/maxScore/percentage/
   * stars/level) -- or the default (level 1 unlocked, nothing finished yet)
   * when nothing was ever saved or the stored entry can't be trusted
   * (corrupted JSON or an incompatible schema version -- discarded and
   * logged via `PROGRESS_DISCARD_INCOMPATIBLE_CODE`, never guessed at).
   */
  async getProgress() {
    const raw = await this.#readRaw();
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
      this.#logService.logStateDiscarded(MODE_ID, PROGRESS_DISCARD_INCOMPATIBLE_CODE);
      return defaultProgress();
    }

    return parsed;
  }

  async getMaxUnlockedLevel() {
    return (await this.getProgress()).maxUnlockedLevel;
  }

  async getUnlockCount() {
    return (await this.getProgress()).unlockCount;
  }

  async getLastResult() {
    return (await this.getProgress()).lastResult;
  }

  /** Aciertos, out of a level's ROUNDS_PER_GAME rounds, needed to unlock `level + 1` -- this mode's own entry in unlockThresholds.js's per-mode table, never any other mode's. */
  getUnlockThreshold(level) {
    return unlockThresholds.getUnlockThreshold(MODE_ID, level);
  }

  /** Tallies one more Línea del tiempo game started at `level` into the existing local diagnostics (logging.js's generic per-mode counters). */
  recordGameStarted(level) {
    this.#logService.logRoundGameStarted(MODE_ID, level);
  }

  /** Tallies one more Línea del tiempo game left before it finished, at `level`. */
  recordGameAbandoned(level) {
    this.#logService.logRoundGameAbandoned(MODE_ID, level);
  }

  /**
   * Finishes a Línea del tiempo level: resolves whether it unlocks the next
   * one via `gameFlow.resolveLevelOutcome` (scoped to `MODE_ID`, the same
   * shared contract src/game/timelineRound.js's `completeLevel` drives live
   * gameplay with), persists this device's progreso/aciertos/estrellas under
   * `dinoquiz:timeline:progress` -- monotonic, exactly like
   * ModeProgressStorage.js's own `recordLevelUnlocked` (replaying an
   * already-cleared level is a no-op, never double-counts `unlockCount`) --
   * and tallies the finished game plus its aciertos/estrellas into the
   * existing local diagnostics. Never reads or writes any other mode's
   * threshold, key or counter.
   */
  async recordGameFinished({ level, answers, score, maxScore }) {
    const outcome = gameFlow.resolveLevelOutcome({ level, answers, modeId: MODE_ID });
    const normalized = scoring.normalizeOutcome(score, maxScore);
    const correctCount = countCorrectAnswers(answers);

    const current = await this.getProgress();
    const advances = !outcome.gameOver && outcome.nextLevel > current.maxUnlockedLevel;

    const updated = Object.assign({}, current, {
      maxUnlockedLevel: advances ? outcome.nextLevel : current.maxUnlockedLevel,
      unlockCount: advances ? current.unlockCount + 1 : current.unlockCount,
      lastResult: {
        score,
        maxScore,
        percentage: normalized.percentage,
        stars: normalized.stars,
        level,
      },
    });

    const persisted = await this.#write(updated);
    if (!persisted) {
      this.#logService.logEvent(PROGRESS_PERSIST_ERROR_CODE);
    }

    this.#logService.logRoundGameCompleted(MODE_ID, level);
    for (let i = 0; i < correctCount; i += 1) {
      this.#logService.logRoundCorrectAnswer(MODE_ID, level);
    }
    this.#logService.logRoundStarsEarned(MODE_ID, level, normalized.stars);

    return {
      progress: updated,
      unlocked: advances,
      nextLevel: advances ? outcome.nextLevel : null,
      percentage: normalized.percentage,
      stars: normalized.stars,
    };
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

/** Shared instance for the rest of the app to import directly (mirrors src/services/storage/index.js's own singletons). */
const timelineProgressService = new TimelineProgressService();

module.exports = {
  TimelineProgressService,
  timelineProgressService,
  MODE_ID,
  PROGRESS_KEY,
  PROGRESS_SCHEMA_VERSION,
  PROGRESS_PERSIST_ERROR_CODE,
  PROGRESS_DISCARD_INCOMPATIBLE_CODE,
};
