'use strict';

/**
 * Local nickname ("apodo") persistence.
 *
 * Client-only, namespaced under `dinoquiz:` per the PRD's local-state
 * constraint (no accounts/auth/cloud sync, PRD out_of_scope) -- deliberately
 * plain localStorage, mirroring the same direct-localStorage pattern
 * public/scripts/modeStorage.js's `dinoquiz:lastMode` and
 * public/scripts/soundService.js's `dinoquiz:muted` already use for a single
 * small value, rather than src/services/storage's IndexedDB-with-fallback
 * client.
 *
 * Privacy (PRD G7, approvedEvents.js's PII_FIELD_DENYLIST already blocks
 * `nombre`/`apodo` from analytics/log payloads): the nickname is free text a
 * child may type, so this module never throws and never logs or otherwise
 * surfaces its VALUE -- every failure path (storage missing, quota exceeded,
 * corrupted stored value) degrades silently to "no nickname" so the caller
 * can always fall back to playing as guest instead of blocking on an error.
 */

const NICKNAME_STORAGE_KEY = 'dinoquiz:nickname';

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

/**
 * Reads the persisted nickname, trimmed. Returns null if none was ever
 * saved, storage is unavailable, or the stored value is corrupted/decodes
 * to a non-string/blank-after-trim -- never throws, so a caller can always
 * fall back to guest play instead of handling an error.
 */
function getNickname(storageAdapter) {
  const storage = resolveStorage(storageAdapter);
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(NICKNAME_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'string') {
      return null;
    }
    const trimmed = parsed.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (error) {
    return null;
  }
}

/**
 * Removes the persisted nickname, if any. Returns true once storage no
 * longer holds the key (an already-absent key counts as success), false
 * only if storage is unavailable or the removal itself throws (e.g.
 * private-mode restrictions) -- the caller keeps working as guest either
 * way.
 */
function clearNickname(storageAdapter) {
  const storage = resolveStorage(storageAdapter);
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(NICKNAME_STORAGE_KEY);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Persists `nickname`, trimmed of surrounding whitespace. A blank or
 * whitespace-only value is treated as "no nickname" -- it clears any
 * previously stored one instead of ever writing an empty entry. Returns
 * true if the resulting state was durably persisted, false if storage is
 * unavailable or throws (e.g. quota exceeded) -- the caller keeps working
 * either way (guest play continues uninterrupted), this only reports
 * whether the nickname will be remembered next time.
 */
function saveNickname(nickname, storageAdapter) {
  const trimmed = typeof nickname === 'string' ? nickname.trim() : '';
  if (trimmed.length === 0) {
    return clearNickname(storageAdapter);
  }

  const storage = resolveStorage(storageAdapter);
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify(trimmed));
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  getNickname,
  saveNickname,
  clearNickname,
  NICKNAME_STORAGE_KEY,
};
