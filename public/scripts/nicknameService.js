'use strict';

/**
 * Local player profile persistence: nickname ("apodo") and, optionally, the
 * selected dinosaur avatar id -- both read/written together under the same
 * `dinoquiz:nickname` entry instead of two independent services/keys, so a
 * consumer only ever has to coordinate one storage operation for the pair.
 *
 * The implementation lives here in public/scripts/ (not only in
 * src/services/) because, without a bundler, the browser can only run code
 * it loads as a plain `<script>` (see public/index.html) -- public/scripts/main.js's
 * game-start flow reads it live, and the Home screen's nickname edit/delete
 * action does too. It registers itself on `window.DinoQuiz.services.nicknameService`,
 * the same require-or-`window.DinoQuiz` bridge every other browser-facing
 * service uses (modeStorage.js, analytics.js). The canonical
 * `src/services/nicknameService.js` module re-exports this file so Node/Jest
 * keep a single source of truth, mirroring how src/services/modeStorage.js
 * re-exports public/scripts/modeStorage.js.
 *
 * Client-only, namespaced under `dinoquiz:` per the PRD's local-state
 * constraint (no accounts/auth/cloud sync, PRD out_of_scope) -- deliberately
 * plain localStorage, mirroring the same direct-localStorage pattern
 * public/scripts/modeStorage.js's `dinoquiz:lastMode` and
 * public/scripts/soundService.js's `dinoquiz:muted` already use for a single
 * small value, rather than src/services/storage's IndexedDB-with-fallback
 * client.
 *
 * Avatar selection is always optional (player-avatars convention): a
 * missing/null/unknown avatar id is a normal state, never an error, and
 * `getAvatar` resolves it independently of whether a nickname was ever
 * saved. The entry is stored as `{ nickname, avatarId }` once either field
 * is set; a bare JSON string written by an older build (nickname only, no
 * avatar) is still read correctly, with avatarId defaulting to null.
 *
 * Privacy (PRD G7, approvedEvents.js's PII_FIELD_DENYLIST already blocks
 * `nombre`/`apodo` from analytics/log payloads): the nickname is free text a
 * child may type, so this module never throws and never logs or otherwise
 * surfaces its VALUE -- every failure path (storage missing, quota exceeded,
 * corrupted stored value) degrades silently to "no nickname"/"no avatar" so
 * the caller can always fall back to playing as guest instead of blocking on
 * an error (AW8).
 */

(function () {
  var NICKNAME_STORAGE_KEY = 'dinoquiz:nickname';

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

  function normalizeField(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  /**
   * Reads the persisted `{ nickname, avatarId }` pair, each trimmed and
   * defaulting to null when absent. Tolerates the plain-string shape an
   * older build of this service wrote (nickname only), and never throws --
   * storage unavailable, corrupted JSON, or an unexpected decoded shape all
   * degrade to `{ nickname: null, avatarId: null }`.
   */
  function readProfile(storage) {
    try {
      var raw = storage.getItem(NICKNAME_STORAGE_KEY);
      if (raw === null) {
        return { nickname: null, avatarId: null };
      }
      var parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        var legacyNickname = normalizeField(parsed);
        return { nickname: legacyNickname.length > 0 ? legacyNickname : null, avatarId: null };
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        var nickname = normalizeField(parsed.nickname);
        var avatarId = normalizeField(parsed.avatarId);
        return {
          nickname: nickname.length > 0 ? nickname : null,
          avatarId: avatarId.length > 0 ? avatarId : null,
        };
      }
      return { nickname: null, avatarId: null };
    } catch (error) {
      return { nickname: null, avatarId: null };
    }
  }

  /**
   * Persists `nickname`/`avatarId` together, omitting the entry entirely
   * once both have ended up empty instead of ever writing a dead record.
   * Returns true if the resulting state was durably persisted, false if
   * storage is unavailable or throws (e.g. quota exceeded) -- the caller
   * keeps working either way, this only reports whether the choice will be
   * remembered next time.
   */
  function writeProfile(nickname, avatarId, storage) {
    if (!nickname && !avatarId) {
      try {
        storage.removeItem(NICKNAME_STORAGE_KEY);
        return true;
      } catch (error) {
        return false;
      }
    }

    try {
      storage.setItem(
        NICKNAME_STORAGE_KEY,
        JSON.stringify({ nickname: nickname || null, avatarId: avatarId || null })
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Reads the persisted nickname, trimmed. Returns null if none was ever
   * saved, storage is unavailable, or the stored value is corrupted/decodes
   * to a non-string/blank-after-trim -- never throws, so a caller can always
   * fall back to guest play instead of handling an error.
   */
  function getNickname(storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return null;
    }
    return readProfile(storage).nickname;
  }

  /**
   * Reads the persisted avatar id, trimmed. Returns null (meaning "no
   * avatar selected") if none was ever saved, storage is unavailable, or the
   * stored value is corrupted/decodes to a non-string/blank-after-trim --
   * never throws, so a caller can always fall back to showing no avatar.
   */
  function getAvatar(storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return null;
    }
    return readProfile(storage).avatarId;
  }

  /**
   * Removes the persisted nickname, if any, leaving a previously saved
   * avatar untouched. Returns true once the nickname is gone (an
   * already-absent nickname counts as success), false only if storage is
   * unavailable or the write itself throws (e.g. private-mode restrictions)
   * -- the caller keeps working as guest either way.
   */
  function clearNickname(storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return false;
    }
    var avatarId = readProfile(storage).avatarId;
    return writeProfile('', avatarId, storage);
  }

  /**
   * Removes the persisted avatar id, if any, leaving a previously saved
   * nickname untouched. Returns true once the avatar is gone (an
   * already-absent avatar counts as success), false only if storage is
   * unavailable or the write itself throws -- the caller keeps working with
   * no avatar either way.
   */
  function clearAvatar(storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return false;
    }
    var nickname = readProfile(storage).nickname;
    return writeProfile(nickname, '', storage);
  }

  /**
   * Persists `nickname`, trimmed of surrounding whitespace, alongside
   * whatever avatar id is already saved (if any). A blank or
   * whitespace-only value is treated as "no nickname" -- it clears any
   * previously stored one instead of ever writing an empty entry. Returns
   * true if the resulting state was durably persisted, false if storage is
   * unavailable or throws (e.g. quota exceeded) -- the caller keeps working
   * either way (guest play continues uninterrupted), this only reports
   * whether the nickname will be remembered next time.
   */
  function saveNickname(nickname, storageAdapter) {
    var trimmed = normalizeField(nickname);
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return false;
    }
    var avatarId = readProfile(storage).avatarId;
    return writeProfile(trimmed, avatarId, storage);
  }

  /**
   * Persists `avatarId`, trimmed of surrounding whitespace, alongside
   * whatever nickname is already saved (if any). A blank, whitespace-only,
   * null/undefined or otherwise non-string value is treated as "no avatar"
   * -- it clears any previously stored one instead of ever writing an empty
   * entry, which keeps avatar selection optional. Returns true if the
   * resulting state was durably persisted, false if storage is unavailable
   * or throws -- the caller keeps working either way, this only reports
   * whether the choice will be remembered next time.
   */
  function saveAvatar(avatarId, storageAdapter) {
    var trimmed = normalizeField(avatarId);
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return false;
    }
    var nickname = readProfile(storage).nickname;
    return writeProfile(nickname, trimmed, storage);
  }

  var api = {
    getNickname: getNickname,
    saveNickname: saveNickname,
    clearNickname: clearNickname,
    getAvatar: getAvatar,
    saveAvatar: saveAvatar,
    clearAvatar: clearAvatar,
    NICKNAME_STORAGE_KEY: NICKNAME_STORAGE_KEY,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.nicknameService = api;
  }
})();
