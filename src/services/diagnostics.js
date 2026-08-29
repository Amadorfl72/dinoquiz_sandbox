'use strict';

/**
 * Local diagnostics service (TRIOFSND-317, PRD "Diagnóstico y métricas
 * agregadas almacenadas únicamente en el dispositivo"): aggregated counters,
 * seven-day retention and structured error codes, all local-only.
 *
 * Each concept lives under its own `dinoquiz:metrics:*`/
 * `dinoquiz:diagnostics:*` key, plain localStorage like
 * nicknameService.js/hallOfFameService.js (this is a handful of small
 * aggregated values, not a whole game session -- it doesn't need
 * src/services/storage's async IndexedDB-with-fallback machinery). Unlike
 * those two modules -- which fail silently and simply drop the write rather
 * than block gameplay -- every write here also degrades to an in-memory
 * store when localStorage is unavailable or throws, so counters/errors/
 * retention keep accumulating for the rest of this page load instead of
 * being silently lost (the task's explicit "degradación en memoria").
 *
 * `incrementCounter(name)` never interprets `name` -- it is only ever an
 * opaque aggregation key a caller chooses, e.g. `selectorOpen`,
 * `gameStarted:parejas`, `gamesByModeLevel:clasifica:2`,
 * `correctAnswers:oidoJurasico`, `starsEarned:timeline` (called once per
 * star to add an amount), `unlocks:laberinto` -- covering aperturas del
 * selector, partidas iniciadas/completadas/abandonadas por modo, partidas
 * por modo y nivel, aciertos/estrellas agregados por modo y desbloqueos por
 * modo without this module needing to know about modes or levels at all.
 *
 * Privacy (PRD "ningún dato generado por el jugador puede salir del
 * dispositivo", "analítica remota ... fuera del dispositivo" out of scope):
 * counters are aggregated names/counts only, never round content;
 * `recordError` persists only today's local date, mode, category and a
 * stable code, never the player's answer/selection. Retention is derived
 * purely from local calendar dates already recorded on this device -- no
 * install/advertising id is read, generated or sent anywhere.
 */

const COUNTERS_KEY = 'dinoquiz:metrics:counters';
const ERRORS_KEY = 'dinoquiz:diagnostics:errors';
const RETENTION_KEY = 'dinoquiz:diagnostics:retention';

// Every key this module owns -- resetDiagnostics() clears exactly these,
// never a mode's progress/unlock/session keys (owned by other services,
// e.g. ModeProgressStorage.js/GameSessionStorage.js).
const DIAGNOSTICS_KEYS = [COUNTERS_KEY, ERRORS_KEY, RETENTION_KEY];

const MAX_ERROR_ENTRIES = 500;
const RETENTION_WINDOW_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// In-memory degradation: survives only for this page load, keyed the same
// way localStorage would be. Only ever holds entries for DIAGNOSTICS_KEYS.
const memoryFallback = Object.create(null);

/** Resolves the localStorage-like adapter to use, tolerating a `window.localStorage` getter that itself throws (mirrors hallOfFameService.js/nicknameService.js). */
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

function readRaw(key, storageAdapter) {
  const storage = resolveStorage(storageAdapter);
  if (storage) {
    try {
      const value = storage.getItem(key);
      if (value !== null && value !== undefined) {
        return value;
      }
    } catch (error) {
      // Falls through to the in-memory fallback below.
    }
  }
  return Object.prototype.hasOwnProperty.call(memoryFallback, key) ? memoryFallback[key] : null;
}

/** Writes `value` to storage; on failure (or no storage at all) degrades to the in-memory fallback instead of losing the write. Returns whether it was durably persisted. */
function writeRaw(key, value, storageAdapter) {
  const storage = resolveStorage(storageAdapter);
  if (storage) {
    try {
      storage.setItem(key, value);
      delete memoryFallback[key];
      return true;
    } catch (error) {
      // Falls through to the in-memory fallback below.
    }
  }
  memoryFallback[key] = value;
  return false;
}

function removeRaw(key, storageAdapter) {
  const storage = resolveStorage(storageAdapter);
  if (storage) {
    try {
      storage.removeItem(key);
    } catch (error) {
      // Ignored -- the in-memory copy is cleared below regardless.
    }
  }
  delete memoryFallback[key];
}

function readJSON(key, fallbackValue, isValid, storageAdapter) {
  const raw = readRaw(key, storageAdapter);
  if (raw === null) {
    return fallbackValue;
  }
  try {
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function writeJSON(key, value, storageAdapter) {
  return writeRaw(key, JSON.stringify(value), storageAdapter);
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isCountersMap(value) {
  return isPlainObject(value) && Object.values(value).every((count) => Number.isFinite(count));
}

function isErrorsArray(value) {
  return Array.isArray(value);
}

function isRetentionRecord(value) {
  return isPlainObject(value) && typeof value.installDate === 'string' && Array.isArray(value.returnDates);
}

/** `YYYY-MM-DD` from the device's local calendar (never UTC) -- deliberately date-only, mirrors public/scripts/logging.js's own `localDateString`. */
function localDateString(date) {
  const d = date instanceof Date ? date : new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Whole local days between two `YYYY-MM-DD` strings (positive when `toDateString` is later). */
function daysBetween(fromDateString, toDateString) {
  const from = new Date(`${fromDateString}T00:00:00`);
  const to = new Date(`${toDateString}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Adds one to the named counter and persists the whole counters map.
 * `name` is an opaque aggregation key chosen by the caller (see module doc)
 * -- never interpreted here. Returns the counter's new total; `0` without
 * writing anything for an invalid (non-string/empty) `name`.
 */
function incrementCounter(name, storageAdapter) {
  if (typeof name !== 'string' || name.length === 0) {
    return 0;
  }
  const counters = readJSON(COUNTERS_KEY, {}, isCountersMap, storageAdapter);
  const next = (counters[name] || 0) + 1;
  counters[name] = next;
  writeJSON(COUNTERS_KEY, counters, storageAdapter);
  return next;
}

/** A copy of every counter tallied via `incrementCounter` so far, `{}` if none. */
function getCounters(storageAdapter) {
  return Object.assign({}, readJSON(COUNTERS_KEY, {}, isCountersMap, storageAdapter));
}

/**
 * Records that the app was opened today (a "return"), for
 * `computeSevenDayRetention` below. The first call ever on this device also
 * sets that day as the install date -- entirely local, no remote/
 * advertising id is read or generated. Repeat calls on the same local day
 * are idempotent (the date is only ever recorded once). `date` is optional,
 * for tests that need to simulate a specific day; defaults to now.
 */
function recordLocalReturn(date, storageAdapter) {
  const today = localDateString(date);
  const record = readJSON(RETENTION_KEY, { installDate: today, returnDates: [] }, isRetentionRecord, storageAdapter);

  if (!record.returnDates.includes(today)) {
    record.returnDates = [...record.returnDates, today];
  }

  return writeJSON(RETENTION_KEY, record, storageAdapter);
}

/**
 * Whether this installation returned on a local day other than its install
 * day, within `RETENTION_WINDOW_DAYS` days of it -- `false` if
 * `recordLocalReturn` was never called (no install date recorded yet) or no
 * such return happened. Computed entirely from local calendar dates already
 * recorded on this device via `recordLocalReturn`.
 */
function computeSevenDayRetention(storageAdapter) {
  const record = readJSON(RETENTION_KEY, null, isRetentionRecord, storageAdapter);
  if (!record) {
    return false;
  }
  return record.returnDates.some((returnDate) => {
    const diff = daysBetween(record.installDate, returnDate);
    return diff > 0 && diff <= RETENTION_WINDOW_DAYS;
  });
}

/**
 * Records one structured error: only today's local date, `mode`, `category`
 * and a stable `code` -- never the player's content/answer/selection (PRD
 * "ningún dato generado por el jugador puede salir del dispositivo"). All
 * three must be non-empty strings; an invalid call mutates nothing and
 * returns `false`. Rotated at `MAX_ERROR_ENTRIES`, same shape as every other
 * log array in this codebase (mirrors public/scripts/logging.js's
 * `MAX_LOGS`).
 */
function recordError(mode, category, code, storageAdapter) {
  if (typeof mode !== 'string' || mode.length === 0) {
    return false;
  }
  if (typeof category !== 'string' || category.length === 0) {
    return false;
  }
  if (typeof code !== 'string' || code.length === 0) {
    return false;
  }

  const errors = readJSON(ERRORS_KEY, [], isErrorsArray, storageAdapter);
  errors.push({ date: localDateString(), mode, category, code });
  const trimmed = errors.length > MAX_ERROR_ENTRIES ? errors.slice(-MAX_ERROR_ENTRIES) : errors;

  return writeJSON(ERRORS_KEY, trimmed, storageAdapter);
}

/** A copy of every error recorded via `recordError` so far, `[]` if none. */
function getErrors(storageAdapter) {
  return readJSON(ERRORS_KEY, [], isErrorsArray, storageAdapter).slice();
}

/**
 * Resets only this module's own keys -- the counters map, recorded errors
 * and the retention record -- never a mode's progress/unlock/session state,
 * which lives under other services' own `dinoquiz:` keys and is never
 * touched here.
 */
function resetDiagnostics(storageAdapter) {
  DIAGNOSTICS_KEYS.forEach((key) => removeRaw(key, storageAdapter));
}

module.exports = {
  incrementCounter,
  getCounters,
  recordLocalReturn,
  computeSevenDayRetention,
  recordError,
  getErrors,
  resetDiagnostics,
  COUNTERS_KEY,
  ERRORS_KEY,
  RETENTION_KEY,
  DIAGNOSTICS_KEYS,
};
