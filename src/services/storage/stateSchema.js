'use strict';

/**
 * Pure integrity validator for `PersistedModeState` (TRIOFSND-297, see
 * src/services/storage/types.js for the versioned schema itself).
 *
 * `isValidModeState` is the single, reusable structural + range check for a
 * per-mode state snapshot: a schema version that matches
 * MODE_STATE_SCHEMA_VERSION, a mode id modesCatalog.js actually knows about,
 * a level within the shared unlock range (unlockThresholds.js's
 * MIN_LEVEL..MAX_LEVEL), a current round within a game's ROUNDS_PER_GAME
 * (roundContract.js), and an answered-response count that can never exceed
 * the rounds actually reached. It is pure -- no I/O, never mutates or
 * throws -- so any caller can validate a snapshot before trusting it,
 * independent of how it was read.
 *
 * This does not replace GameSessionStorage.js's `isValidEnvelope` or
 * ModeProgressStorage.js's `isValidProgress`: those validate their own,
 * differently-shaped envelopes (a live roundContract.js session, a
 * level-progress record). This module defines the shared, minimal per-mode
 * contract (modo/nivel/ronda actual/respuestas contabilizadas) those and
 * future per-mode persistence can be checked against.
 */

const { MODE_STATE_SCHEMA_VERSION } = require('./types');
const { MODE_IDS } = require('../../game/modesCatalog');
const { MIN_LEVEL, MAX_LEVEL } = require('../../game/unlockThresholds');
const { ROUNDS_PER_GAME } = require('../../game/roundContract');

const VALID_MODE_IDS = Object.values(MODE_IDS);

function isValidModeId(modeId) {
  return typeof modeId === 'string' && VALID_MODE_IDS.includes(modeId);
}

function isValidLevel(level) {
  return Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL;
}

function isValidCurrentRound(currentRound) {
  return Number.isInteger(currentRound) && currentRound >= 0 && currentRound < ROUNDS_PER_GAME;
}

/** Never more counted responses than the rounds reached so far (currentRound is 0-based, so currentRound + 1 rounds have been reached). */
function isValidAnsweredCount(answeredCount, currentRound) {
  return (
    Number.isInteger(answeredCount) &&
    answeredCount >= 0 &&
    answeredCount <= ROUNDS_PER_GAME &&
    answeredCount <= currentRound + 1
  );
}

/**
 * Rejects (returns false, never throws) anything that isn't a plain object,
 * carries a schema version other than MODE_STATE_SCHEMA_VERSION, names an
 * unknown mode, or has a level/currentRound/answeredCount outside its valid
 * range -- including an answeredCount that claims more counted responses
 * than the rounds reached so far. Only a structurally and numerically
 * consistent `PersistedModeState` passes.
 */
function isValidModeState(state) {
  if (!state || typeof state !== 'object') {
    return false;
  }
  if (state.schemaVersion !== MODE_STATE_SCHEMA_VERSION) {
    return false;
  }
  if (!isValidModeId(state.modeId)) {
    return false;
  }
  if (!isValidLevel(state.level)) {
    return false;
  }
  if (!isValidCurrentRound(state.currentRound)) {
    return false;
  }
  if (!isValidAnsweredCount(state.answeredCount, state.currentRound)) {
    return false;
  }
  return true;
}

module.exports = { MODE_STATE_SCHEMA_VERSION, isValidModeState };
