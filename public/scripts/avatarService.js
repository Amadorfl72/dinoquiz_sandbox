'use strict';

/**
 * Local player-avatar persistence (TrioForge, "avatar de dinosaurio").
 *
 * Stores only the chosen avatar `id` (never image data or anything else)
 * under a single `dinoquiz.playerAvatar` localStorage key, per the player
 * avatars convention. Deliberately plain localStorage -- same
 * direct-localStorage pattern as public/scripts/nicknameService.js's
 * `dinoquiz:nickname` and public/scripts/hallOfFameService.js's
 * `dinoquiz:hallOfFame` -- rather than src/services/storage's
 * IndexedDB-with-fallback client, since this is a single small value read
 * alongside the nickname.
 *
 * Optional-selection contract: choosing an avatar is optional, and an
 * unknown/missing/corrupted stored id must never break the game -- every
 * method resolves storage lazily and wraps every read/write in try/catch
 * (AW8, mirrors nicknameService.js/hallOfFameService.js/modeStorage.js), so
 * a blocked or unavailable localStorage (private browsing, quota exceeded,
 * disabled storage) degrades to "no avatar" (`null`/`false`) instead of
 * throwing or blocking the rest of the game. This module itself does not
 * validate the id against the avatar catalog -- an id no longer present
 * there is still returned as-is, and it is up to the caller rendering the
 * avatar to treat an unrecognized id as "no avatar".
 *
 * Browser bridge: following the same dual CommonJS/`window.DinoQuiz` pattern
 * as public/scripts/nicknameService.js, this implementation lives here and
 * is loaded as a plain `<script>` (see public/index.html), registering
 * itself on `window.DinoQuiz.services.avatarService`. The canonical
 * `src/services/avatarService.js` re-exports this file so Node/Jest keep a
 * single source of truth.
 */

(function () {
  var AVATAR_STORAGE_KEY = 'dinoquiz.playerAvatar';

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
   * Reads the persisted avatar id, trimmed. Returns null (the "no avatar"
   * default) if none was ever saved, storage is unavailable, or the stored
   * value is corrupted/decodes to a non-string/blank-after-trim -- never
   * throws, so a caller can always fall back to showing no avatar.
   */
  function getAvatar(storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return null;
    }

    try {
      var raw = storage.getItem(AVATAR_STORAGE_KEY);
      if (raw === null) {
        return null;
      }
      var parsed = JSON.parse(raw);
      if (typeof parsed !== 'string') {
        return null;
      }
      var trimmed = parsed.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Removes the persisted avatar id, if any. Returns true once storage no
   * longer holds the key (an already-absent key counts as success), false
   * only if storage is unavailable or the removal itself throws -- the
   * caller keeps working with no avatar either way.
   */
  function clearAvatar(storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return false;
    }

    try {
      storage.removeItem(AVATAR_STORAGE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Persists `avatarId`, trimmed of surrounding whitespace. A blank,
   * whitespace-only or non-string value is treated as "no avatar" -- it
   * clears any previously stored one instead of ever writing an empty
   * entry. Returns true if the resulting state was durably persisted, false
   * if storage is unavailable or throws (e.g. quota exceeded) -- the caller
   * keeps working either way, this only reports whether the choice will be
   * remembered next time.
   */
  function saveAvatar(avatarId, storageAdapter) {
    var trimmed = typeof avatarId === 'string' ? avatarId.trim() : '';
    if (trimmed.length === 0) {
      return clearAvatar(storageAdapter);
    }

    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return false;
    }

    try {
      storage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(trimmed));
      return true;
    } catch (error) {
      return false;
    }
  }

  var api = {
    getAvatar: getAvatar,
    saveAvatar: saveAvatar,
    clearAvatar: clearAvatar,
    AVATAR_STORAGE_KEY: AVATAR_STORAGE_KEY,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.avatarService = api;
  }
})();
