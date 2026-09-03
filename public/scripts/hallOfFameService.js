'use strict';

/**
 * Hall of Fame local persistence (TRIOFSND, "Salón de la Fama").
 *
 * The implementation lives here in public/scripts/ (not only in
 * src/services/) because public/scripts/main.js's game-finish flow has to
 * read/write it live in the real, bundler-less browser -- it is loaded there
 * as a `<script>` (see public/index.html), registering itself on
 * `window.DinoQuiz.services.hallOfFameService`, the same require-or-
 * `window.DinoQuiz` bridge every other browser-facing service uses
 * (modeStorage.js, analytics.js, nicknameService.js). The canonical
 * `src/services/hallOfFameService.js` module re-exports this file so
 * Node/Jest keep a single source of truth, mirroring how
 * src/services/modeStorage.js re-exports public/scripts/modeStorage.js.
 *
 * Stores the on-device top-10 scores under a single `dinoquiz:hallOfFame`
 * localStorage key. Deliberately plain localStorage rather than
 * src/services/storage's IndexedDB-with-fallback client: a short, replaceable
 * top-10 list doesn't need that machinery, and this mirrors the same
 * direct-localStorage pattern src/services/modeStorage.js already uses for
 * `dinoquiz:lastMode`. Read/written and rendered entirely on this device --
 * never sent to a server (PRD G7 "proteger la privacidad infantil",
 * AC-15: local-only persistence).
 *
 * No-name / guest contract (single source of truth other tasks build on):
 * a game finished without a name is stored as `name: null`, never an
 * empty-string placeholder and never dropped from the list. `null` is the
 * only value a caller (e.g. the results/hall-of-fame screen) needs to check
 * for to render the guest label -- an empty string or a missing row would
 * both be ambiguous ("was a name typed and blank, or not asked at all?").
 * `addEntry` normalizes any non-string or blank/whitespace-only `name` to
 * `null` itself, so callers never have to reproduce this rule.
 *
 * Ranking and tie-break: entries sort by `score` descending; entries with
 * the same score sort by `timestamp` ascending (the earlier game wins the
 * higher spot). This is a *documented, deterministic* tie-break -- not just
 * "whatever order they happened to be inserted in" -- specifically so the
 * same two equal scores always land in the same relative order on every
 * read, and the list never visibly reshuffles itself between visits. Only
 * the top MAX_ENTRIES survive a write; the 11th-best (and lower) entries
 * fall off.
 *
 * Tolerate-storage-failure pattern (AW8, mirrors modeStorage.js): every
 * method resolves storage lazily and wraps every read/write in try/catch.
 * Blocked or unavailable localStorage (private browsing, quota exceeded,
 * disabled storage) never throws and never blocks gameplay -- `addEntry`
 * still returns the computed top-10 list for the caller to render even if
 * persisting it failed, `getEntries` degrades to `[]`, and `clearAll`
 * degrades to `false`.
 */

(function () {
  var STORAGE_KEY = 'dinoquiz:hallOfFame';
  var MAX_ENTRIES = 10;

  /**
   * Resolves the localStorage-like adapter to use. Wrapped in try/catch
   * because merely *accessing* `window.localStorage` can throw a
   * SecurityError in browsers where storage is blocked (e.g. some private
   * browsing modes, or a `localStorage` getter that throws) -- not just
   * calling `getItem`/`setItem` on it. Without this guard that throw would
   * escape from `getEntries`/`addEntry`/`clearAll` before their own
   * try/catch around the storage operation ever runs, violating AW8.
   */
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

  /** Non-empty, trimmed string -> itself; anything else (missing, blank, non-string) -> `null` -- the guest contract described above. */
  function normalizeName(name) {
    if (typeof name !== 'string') {
      return null;
    }
    var trimmed = name.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  function isValidEntry(entry) {
    return (
      !!entry &&
      typeof entry === 'object' &&
      (entry.name === null || typeof entry.name === 'string') &&
      Number.isFinite(entry.score) &&
      Number.isFinite(entry.timestamp)
    );
  }

  /** Score desc, then timestamp asc (earlier game wins a tie) -- see the module doc for why this is the documented tie-break rule. */
  function compareEntries(a, b) {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.timestamp - b.timestamp;
  }

  function readEntries(storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return [];
    }

    try {
      var raw = storage.getItem(STORAGE_KEY);
      if (raw === null) {
        return [];
      }
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isValidEntry).slice(0, MAX_ENTRIES);
    } catch (error) {
      return [];
    }
  }

  /**
   * The persisted top-10 list, already sorted (score desc, timestamp asc).
   * Resolves to `[]` if nothing was ever saved, storage is unavailable, or the
   * stored value is corrupted/not an array of valid entries -- never throws.
   */
  function getEntries(storageAdapter) {
    return readEntries(storageAdapter);
  }

  /**
   * Inserts `{ name, score, timestamp }` into the Hall of Fame, re-sorts the
   * whole list by the documented rule (score desc, timestamp asc) and keeps
   * only the top MAX_ENTRIES. `name` is normalized to `null` for a guest/
   * no-name game (see the module doc's no-name contract) rather than rejected.
   * `score`/`timestamp` must be finite numbers -- an invalid entry is skipped
   * (the existing list is returned unchanged) rather than corrupting the
   * stored list.
   *
   * Always returns the resulting top-10 list, even if the underlying write
   * failed (AW8): gameplay/rendering never blocks on storage succeeding.
   */
  function addEntry(entry, storageAdapter) {
    var current = readEntries(storageAdapter);

    if (!entry || !Number.isFinite(entry.score) || !Number.isFinite(entry.timestamp)) {
      return current;
    }

    var normalized = {
      name: normalizeName(entry.name),
      score: entry.score,
      timestamp: entry.timestamp,
    };

    var merged = current
      .concat([normalized])
      .sort(compareEntries)
      .slice(0, MAX_ENTRIES);

    var storage = resolveStorage(storageAdapter);
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (error) {
        // Tolerate storage failure (AW8): the computed list is still returned
        // below so the caller can render it, it just won't survive a reload.
      }
    }

    return merged;
  }

  /**
   * Wipes the Hall of Fame entirely -- used by the screen's own delete action
   * and by the privacy-policy data wipe. Resolves to `true` if the removal was
   * attempted without throwing, `false` if storage is unavailable/threw.
   */
  function clearAll(storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return false;
    }

    try {
      storage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  var api = {
    getEntries: getEntries,
    addEntry: addEntry,
    clearAll: clearAll,
    STORAGE_KEY: STORAGE_KEY,
    MAX_ENTRIES: MAX_ENTRIES,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.hallOfFameService = api;
  }
})();
