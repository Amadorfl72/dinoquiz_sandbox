'use strict';

/**
 * Mode-scoped facade over the persisted in-progress game session
 * (src/services/storage/GameSessionStorage.js, TRIOFSND-242) for two
 * callers: the mode-change confirmation flow (TRIOFSND-238, PRD "Contrato
 * técnico y visual común para los modos") -- `hasIncompleteGame`/
 * `discardTransientState` -- and, since TRIOFSND-299, "restaurar ronda en
 * curso al recargar" -- `saveSession`/`restoreGameState`, driven by
 * public/scripts/main.js's roundContract.js-backed modes (Oído Jurásico,
 * Ordena por tamaño) so a page reload mid-game resumes the same mode,
 * level, round and score instead of silently losing it.
 */

const { gameSessionStorage } = require('./storage');
const { isValidModeState } = require('./storage/stateSchema');
const { MODE_STATE_SCHEMA_VERSION } = require('./storage/types');

/**
 * True only when `modeId` has a saved, resumable ('playing' or 'paused')
 * round -- exactly the case where switching away from it would lose
 * progress. Read-only: never discards anything, so merely asking the
 * question can't silently erase a session, including one belonging to a
 * different mode.
 */
async function hasIncompleteGame(modeId) {
  return gameSessionStorage.hasIncompleteSession(modeId);
}

/**
 * Discards `modeId`'s in-progress round once the player has confirmed the
 * mode change. A no-op when the persisted session belongs to a different
 * mode, doesn't exist, or is invalid -- so this can never reach into
 * another mode's transient state or into the durable per-mode progress/
 * results/unlock keys.
 */
async function discardTransientState(modeId) {
  await gameSessionStorage.discardModeSession(modeId);
}

/** Passthrough to GameSessionStorage#saveSession -- see that method's own doc comment. */
async function saveSession(modeId, session) {
  return gameSessionStorage.saveSession(modeId, session);
}

/**
 * Derives the shared, minimal `PersistedModeState` (src/services/storage/
 * types.js, TRIOFSND-297) that `stateSchema.js`'s `isValidModeState` checks
 * from a live roundContract.js session: `currentRound` is the session's own
 * `roundIndex`, `answeredCount` the number of rounds actually scored so far
 * (`session.state.answers.length` -- never re-derived from `score`, which a
 * per-mode scoring rule could scale differently). `level` comes from
 * `session.context.level` (the shape every roundContract.js-driven mode's
 * `context` carries it in, e.g. sizeOrderGame.js/oidoJurasicoScreen.js) and
 * defaults to `1` -- the shared unlocked floor (types.js's own
 * `DEFAULT_STATE.maxUnlockedLevel`) -- for the level-less modes
 * (Oído Jurásico, Ordena por tamaño) whose `context` carries no level of its
 * own to tamper with in the first place.
 */
function deriveModeState(modeId, session) {
  const answers = session.state && Array.isArray(session.state.answers) ? session.state.answers : [];
  const level = session.context && Number.isInteger(session.context.level) ? session.context.level : 1;

  return {
    schemaVersion: MODE_STATE_SCHEMA_VERSION,
    modeId,
    level,
    currentRound: session.roundIndex,
    answeredCount: answers.length,
  };
}

/**
 * Restores `modeId`'s in-progress round (TRIOFSND-299, AC: "leer el estado
 * transitorio persistido, validarlo con schema.js y, si es válido y
 * compatible, restaurar modo/nivel/ronda/puntuación"): reads the persisted
 * envelope via `GameSessionStorage#restoreSession` (already discards a
 * corrupted/incompatible/finished envelope on its own, see that method), and
 * additionally validates the `PersistedModeState` derived from it
 * (`deriveModeState`) against `stateSchema.js`'s `isValidModeState` -- the
 * shared schema contract every mode's persisted state is checked against,
 * catching e.g. a `modeId` roundContract.js's own envelope check doesn't
 * know isn't a real mode.
 *
 * Never re-applies or recomputes any answer/score: the returned `session` is
 * exactly the restored, plain-data roundContract.js session (score, answers
 * and the current round untouched) -- a caller resumes by reattaching a
 * fresh `hooks`/`generateRound` (see GameSessionStorage#restoreSession's own
 * doc comment) and continuing `evaluateAnswer`/`advanceRound` against it, so
 * nothing already contabilized is ever duplicated.
 *
 * Returns null, discarding only `modeId`'s own transient session (AC: "si es
 * inválido, reiniciar únicamente la partida transitoria conservando
 * resultados completados") -- never a different mode's session nor any
 * durable per-mode key (bestScore/maxUnlockedLevel/modeProgress/...), which
 * this never reads or writes -- when there is nothing resumable to restore,
 * or the derived state fails the schema check.
 */
async function restoreGameState(modeId) {
  const session = await gameSessionStorage.restoreSession(modeId);
  if (!session) {
    return null;
  }

  const modeState = deriveModeState(modeId, session);
  if (!isValidModeState(modeState)) {
    await gameSessionStorage.discardModeSession(modeId);
    return null;
  }

  return {
    modeId,
    level: modeState.level,
    currentRound: modeState.currentRound,
    score: session.state.score,
    answeredCount: modeState.answeredCount,
    session,
  };
}

module.exports = {
  hasIncompleteGame,
  discardTransientState,
  saveSession,
  restoreGameState,
};
