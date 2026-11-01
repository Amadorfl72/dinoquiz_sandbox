'use strict';

/**
 * Local player-avatar ("avatar de dinosaurio") persistence.
 *
 * The implementation lives here in public/scripts/ (not only in
 * src/services/) because, without a bundler, the browser can only run code
 * it loads as a plain `<script>` (see public/index.html) -- the same
 * rationale documented for public/scripts/nicknameService.js. It registers
 * itself on `window.DinoQuiz.services.avatarService`, the same
 * require-or-`window.DinoQuiz` bridge nicknameService.js uses. The
 * canonical `src/services/avatarService.js` module re-exports this file so
 * Node/Jest keep a single source of truth, mirroring how
 * src/services/nicknameService.js re-exports public/scripts/nicknameService.js.
 *
 * Stores only the chosen avatar `id` under its own `dinoquiz.playerAvatar`
 * localStorage key, per the player-avatars convention -- the id lives
 * alongside the nickname (both read/written from the same localStorage),
 * but in a separate key so the two can be saved/cleared independently.
 *
 * Optional-selection contract: choosing an avatar is optional, so a missing
 * id (never saved, or cleared) is a normal, expected state -- `getAvatar`
 * returns `null` for it, not an error. AW8: every method resolves storage
 * lazily and wraps every read/write in try/catch, mirroring
 * nicknameService.js's pattern, so a blocked or unavailable localStorage
 * (private browsing, quota exceeded, disabled storage) degrades to
 * "no avatar" (`null`/`false`) instead of throwing or blocking the game.
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
   * Reads the persisted avatar id, trimmed. Returns null (meaning "no
   * avatar selected") if none was ever saved, storage is unavailable, or
   * the stored value is corrupted/decodes to a non-string/blank-after-trim
   * -- never throws, so a caller can always fall back to showing no avatar.
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
   * only if storage is unavailable or the removal itself throws (e.g.
   * private-mode restrictions) -- the caller keeps working with no avatar
   * either way.
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
   * whitespace-only, null/undefined or otherwise non-string value is
   * treated as "no avatar" -- it clears any previously stored one instead
   * of ever writing an empty entry, which keeps avatar selection optional.
   * Returns true if the resulting state was durably persisted, false if
   * storage is unavailable or throws (e.g. quota exceeded) -- the caller
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
