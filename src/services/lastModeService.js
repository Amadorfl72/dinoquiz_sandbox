'use strict';

/**
 * Last-selected mode persistence (TRIOFSND-230).
 *
 * Remembers which game mode (src/game/modesCatalog.js MODE_IDS) the player
 * picked last, so a future mode selector (PRD scope: "Selector ilustrado de
 * modos") can default back to it instead of the catalog's first entry.
 * Client-only, namespaced under `dinoquiz:` per the PRD's local-state
 * constraint -- stores nothing but the mode id string, never name/age/progress,
 * and is never transmitted anywhere (PRD out_of_scope: "Analítica remota").
 *
 * Deliberately plain localStorage rather than src/services/storage's
 * IndexedDB-with-fallback client: a single "which mode was last picked"
 * string doesn't need that machinery, and this mirrors the same
 * direct-localStorage pattern public/scripts/main.js already uses for the
 * `dinoquiz:muted`/`dinoquiz:adsRemoved` flags.
 */

const LAST_MODE_STORAGE_KEY = 'dinoquiz:lastMode';

function resolveStorage(storageAdapter) {
  if (storageAdapter) {
    return storageAdapter;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

/**
 * Reads the last-selected mode id. Returns null if none was ever recorded,
 * storage is unavailable, or the stored value is corrupted/not a non-empty
 * string -- never throws, so a caller can always fall back to the catalog's
 * default mode.
 */
function getLastMode(storageAdapter) {
  const storage = resolveStorage(storageAdapter);
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(LAST_MODE_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const modeId = JSON.parse(raw);
    return typeof modeId === 'string' && modeId.length > 0 ? modeId : null;
  } catch (error) {
    return null;
  }
}

/**
 * Persists `modeId` as the last-selected mode. Resolves to true if the write
 * succeeded, false if `modeId` isn't a non-empty string or storage is
 * unavailable/throws (e.g. private-mode quota) -- the caller keeps working
 * either way, this only reports whether the choice will be remembered next
 * time.
 */
function setLastMode(modeId, storageAdapter) {
  if (typeof modeId !== 'string' || modeId.length === 0) {
    return false;
  }

  const storage = resolveStorage(storageAdapter);
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(LAST_MODE_STORAGE_KEY, JSON.stringify(modeId));
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  getLastMode,
  setLastMode,
  LAST_MODE_STORAGE_KEY,
};
