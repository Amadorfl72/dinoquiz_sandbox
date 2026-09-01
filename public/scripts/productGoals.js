'use strict';

/**
 * Local sign-off registry for the PRD's numeric product goals (distribución
 * por modo, finalización, retención a 7 días) -- lets whoever owns content/
 * product record that a goal's real-world target has been reviewed and
 * approved before it ships to production, without a backend (PRD
 * constraints: no analítica remota, todo estado local bajo `dinoquiz:`).
 *
 * Mirrors nicknameService.js's plain-localStorage-with-adapter-fallback
 * pattern -- a single small JSON blob under one `dinoquiz:` key -- rather
 * than src/services/storage's IndexedDB-with-fallback client, since this is
 * developer/reviewer bookkeeping, not player game state, and never needs to
 * survive one browser's storage being cleared differently from another's.
 *
 * Every goal starts 'pendiente' (not yet approved) until `approve()` is
 * called for it; every read/write degrades silently (never throws, never
 * logs) so a missing or corrupted record just means "treat as pendiente",
 * the same failure philosophy nicknameService.js documents.
 *
 * Browser bridge (TRIOFSND-325): the launch-gate status screen
 * (public/scripts/launchGateScreen.js) is the first caller that needs this
 * read live in the browser, so -- following the same dual CommonJS/
 * `window.DinoQuiz` pattern as public/scripts/offlineStatus.js -- the
 * implementation lives here instead of directly under `src/services/`; the
 * canonical `src/services/productGoals.js` re-exports this file so Node/
 * Jest keep a single source of truth.
 */

(function () {
  var PRODUCT_GOALS_STORAGE_KEY = 'dinoquiz:productGoals';

  var GOAL_IDS = {
    DISTRIBUCION_POR_MODO: 'distribucionPorModo',
    FINALIZACION: 'finalizacion',
    RETENCION_7_DIAS: 'retencion7dias',
  };

  var GOAL_STATUS = {
    PENDIENTE: 'pendiente',
    APROBADO: 'aprobado',
  };

  function defaultGoalRecord() {
    return { status: GOAL_STATUS.PENDIENTE, target: null, approvedAt: null };
  }

  function resolveStorage(storageAdapter) {
    if (storageAdapter) {
      return storageAdapter;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
      if (typeof localStorage !== 'undefined') {
        return localStorage;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function isValidGoalRecord(value) {
    if (!value || typeof value !== 'object') {
      return false;
    }
    if (value.status !== GOAL_STATUS.PENDIENTE && value.status !== GOAL_STATUS.APROBADO) {
      return false;
    }
    return value.target === null || typeof value.target === 'number';
  }

  function readAllGoals(storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return {};
    }

    try {
      var raw = storage.getItem(PRODUCT_GOALS_STORAGE_KEY);
      if (raw === null) {
        return {};
      }
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      var goals = {};
      for (var goalId in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, goalId) && isValidGoalRecord(parsed[goalId])) {
          goals[goalId] = parsed[goalId];
        }
      }
      return goals;
    } catch (error) {
      return {};
    }
  }

  function writeAllGoals(goals, storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return false;
    }

    try {
      storage.setItem(PRODUCT_GOALS_STORAGE_KEY, JSON.stringify(goals));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * The goal's stored record -- `{ status, target, approvedAt }` -- or the
   * 'pendiente' default (`target`/`approvedAt` null) when it was never
   * approved, storage is unavailable, or the stored entry is corrupted.
   */
  function getGoal(goalId, storageAdapter) {
    if (typeof goalId !== 'string' || goalId.trim().length === 0) {
      return defaultGoalRecord();
    }

    var goals = readAllGoals(storageAdapter);
    return goals[goalId] || defaultGoalRecord();
  }

  /** Whether `goalId` has been approved (`status === 'aprobado'`) -- false for pendiente, unknown or corrupted goals. */
  function isApproved(goalId, storageAdapter) {
    return getGoal(goalId, storageAdapter).status === GOAL_STATUS.APROBADO;
  }

  /**
   * Records `goalId` as approved with its reviewed numeric `target`, plus the
   * approval timestamp. Returns true once durably persisted, false if
   * `goalId`/`target` are invalid or storage is unavailable/throws (e.g.
   * quota exceeded) -- the caller can still treat the goal as pendiente
   * either way.
   */
  function approve(goalId, target, storageAdapter) {
    if (typeof goalId !== 'string' || goalId.trim().length === 0) {
      return false;
    }
    if (typeof target !== 'number' || !isFinite(target)) {
      return false;
    }

    var goals = readAllGoals(storageAdapter);
    goals[goalId] = { status: GOAL_STATUS.APROBADO, target: target, approvedAt: Date.now() };
    return writeAllGoals(goals, storageAdapter);
  }

  /** Resets `goalId` back to 'pendiente' (`target`/`approvedAt` null). Returns true once persisted (an already-pendiente goal counts as success), false if storage is unavailable or throws. */
  function resetGoal(goalId, storageAdapter) {
    if (typeof goalId !== 'string' || goalId.trim().length === 0) {
      return false;
    }
    if (!resolveStorage(storageAdapter)) {
      return false;
    }

    var goals = readAllGoals(storageAdapter);
    if (!(goalId in goals)) {
      return true;
    }
    delete goals[goalId];
    return writeAllGoals(goals, storageAdapter);
  }

  /** Every known goal (`GOAL_IDS`) mapped to its current record, defaulting unrecorded ones to 'pendiente'. */
  function getAllGoals(storageAdapter) {
    var goals = readAllGoals(storageAdapter);
    var result = {};
    var ids = [GOAL_IDS.DISTRIBUCION_POR_MODO, GOAL_IDS.FINALIZACION, GOAL_IDS.RETENCION_7_DIAS];
    ids.forEach(function (goalId) {
      result[goalId] = goals[goalId] || defaultGoalRecord();
    });
    return result;
  }

  var api = {
    PRODUCT_GOALS_STORAGE_KEY: PRODUCT_GOALS_STORAGE_KEY,
    GOAL_IDS: GOAL_IDS,
    GOAL_STATUS: GOAL_STATUS,
    getGoal: getGoal,
    isApproved: isApproved,
    approve: approve,
    resetGoal: resetGoal,
    getAllGoals: getAllGoals,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.productGoals = api;
  }
})();
