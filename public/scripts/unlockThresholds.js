'use strict';

/**
 * Per-mode/level unlock-threshold configuration (TRIOFSND-248).
 *
 * `gameFlow.js`'s `resolveLevelOutcome` (TRIOFSND-203) used to compare a
 * level's correct-answer count against a single hardcoded constant
 * (`LEVEL_UP_MIN_CORRECT = 6`) that applied uniformly to every level of the
 * one mode that existed at the time (the quiz). Now that DinoQuiz ships eight
 * independent modes (TRIOFSND-228's `modesCatalog.js`), each with its own
 * progression, the "aciertos needed to unlock the next level" rule can no
 * longer be a single number: it has to be looked up per mode and per level.
 *
 * This module is the explicit source of truth for that lookup: `UNLOCK_THRESHOLDS`
 * maps every mode id (from `modesCatalog.MODE_IDS`) to a threshold for every
 * level from `MIN_LEVEL` to `MAX_LEVEL`. `getUnlockThreshold(modeId, level)`
 * is the read path; `validateUnlockThresholds()` is a completeness check
 * (every mode/level pair the catalog knows about must have a defined
 * threshold) rather than something either lookup silently tolerates gaps in.
 *
 * All eight modes currently share the same threshold (`DEFAULT_UNLOCK_THRESHOLD`,
 * matching the quiz's original `LEVEL_UP_MIN_CORRECT` value) at every level —
 * `buildLevelThresholds` takes an `overrides` map so a future mode/level
 * exception (e.g. an easier ramp for a new mode's first few levels) is a
 * one-line change here, never a change to `gameFlow.js` or any mode's own
 * game logic.
 *
 * Browser bridge: no bundler, so this follows the same dual CommonJS/
 * `window.DinoQuiz` pattern as public/scripts/gameFlow.js and
 * public/scripts/modesCatalog.js. `resolveModesCatalog` is only consulted
 * lazily (inside `getUnlockThreshold`/`validateUnlockThresholds`, never at
 * module load) so this script has no load-order dependency on
 * modesCatalog.js the way gameFlow.js's `resolveQuestionBank` has none on
 * questionBank.js.
 */

(function () {
  var MIN_LEVEL = 1;
  var MAX_LEVEL = 10;

  // Matches gameFlow.js's original LEVEL_UP_MIN_CORRECT (TRIOFSND-203): >=6
  // aciertos (out of a level's 10 questions) unlocks the next level.
  var DEFAULT_UNLOCK_THRESHOLD = 6;

  function buildLevelThresholds(overrides) {
    var thresholds = {};
    for (var level = MIN_LEVEL; level <= MAX_LEVEL; level += 1) {
      thresholds[level] = overrides && Object.prototype.hasOwnProperty.call(overrides, level)
        ? overrides[level]
        : DEFAULT_UNLOCK_THRESHOLD;
    }
    return Object.freeze(thresholds);
  }

  // Explicit per-mode/level table. Every mode currently uses the uniform
  // default at every level; a mode that needs a different ramp overrides just
  // the levels it needs, e.g. buildLevelThresholds({ 1: 5, 2: 5 }).
  var UNLOCK_THRESHOLDS = Object.freeze({
    quiz: buildLevelThresholds(),
    laberinto: buildLevelThresholds(),
    sombra: buildLevelThresholds(),
    oidoJurasico: buildLevelThresholds(),
    parejas: buildLevelThresholds(),
    clasifica: buildLevelThresholds(),
    ordenaPorTamano: buildLevelThresholds(),
    lineaDelTiempo: buildLevelThresholds(),
  });

  function isValidLevel(level) {
    return Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL;
  }

  /** Resolves `src/game/modesCatalog` under Node/Jest, or `window.DinoQuiz.game.modesCatalog` in the browser; null if neither is available. */
  function resolveModesCatalog() {
    if (typeof require === 'function') {
      return require('../../src/game/modesCatalog');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game && window.DinoQuiz.game.modesCatalog) || null;
  }

  /** Every mode id that must have a complete threshold table: modesCatalog's ids when resolvable, else whatever UNLOCK_THRESHOLDS already declares. */
  function getModeIdsToValidate() {
    var modesCatalog = resolveModesCatalog();
    if (modesCatalog && Array.isArray(modesCatalog.MODES_CATALOG)) {
      return modesCatalog.MODES_CATALOG.map(function (mode) {
        return mode.id;
      });
    }
    return Object.keys(UNLOCK_THRESHOLDS);
  }

  /**
   * Looks up the number of aciertos needed, out of a level's 10 questions, to
   * unlock `level + 1` for `modeId`. Throws for an out-of-range level or a
   * mode/level pair with no defined threshold, rather than silently falling
   * back to a default — a gap here means the table is incomplete, which
   * `validateUnlockThresholds` is meant to catch before it reaches a player.
   */
  function getUnlockThreshold(modeId, level) {
    if (!isValidLevel(level)) {
      throw new Error('level must be an integer between ' + MIN_LEVEL + ' and ' + MAX_LEVEL);
    }

    var modeThresholds = UNLOCK_THRESHOLDS[modeId];
    if (!modeThresholds || !Object.prototype.hasOwnProperty.call(modeThresholds, level)) {
      throw new Error('No unlock threshold defined for mode "' + modeId + '" at level ' + level);
    }

    return modeThresholds[level];
  }

  /**
   * Confirms every mode/level pair `getUnlockThreshold` may be asked for has
   * a defined, valid (integer) threshold. Returns a report instead of
   * throwing, so a caller (e.g. a startup check or a test) can see every gap
   * at once rather than stopping at the first.
   */
  function validateUnlockThresholds() {
    var missing = [];

    getModeIdsToValidate().forEach(function (modeId) {
      for (var level = MIN_LEVEL; level <= MAX_LEVEL; level += 1) {
        var modeThresholds = UNLOCK_THRESHOLDS[modeId];
        var hasThreshold = modeThresholds
          && Object.prototype.hasOwnProperty.call(modeThresholds, level)
          && Number.isInteger(modeThresholds[level]);
        if (!hasThreshold) {
          missing.push({ modeId: modeId, level: level });
        }
      }
    });

    return { valid: missing.length === 0, missing: missing };
  }

  var api = {
    MIN_LEVEL: MIN_LEVEL,
    MAX_LEVEL: MAX_LEVEL,
    DEFAULT_UNLOCK_THRESHOLD: DEFAULT_UNLOCK_THRESHOLD,
    UNLOCK_THRESHOLDS: UNLOCK_THRESHOLDS,
    getUnlockThreshold: getUnlockThreshold,
    validateUnlockThresholds: validateUnlockThresholds,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.game = window.DinoQuiz.game || {};
    window.DinoQuiz.game.unlockThresholds = api;
  }
})();
