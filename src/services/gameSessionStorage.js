'use strict';

/**
 * Mode-scoped facade over the persisted in-progress game session
 * (src/services/storage/GameSessionStorage.js, TRIOFSND-242) for the
 * mode-change confirmation flow (TRIOFSND-238, PRD "Contrato técnico y
 * visual común para los modos"): the caller (e.g. the mode selector, when
 * the player picks a mode other than the one they are currently mid-game
 * in) needs to know whether the confirmation dialog
 * (public/scripts/modeChangeConfirmScreen.js) is required
 * (`hasIncompleteGame`) and, once the player confirms, to discard exactly
 * that mode's abandoned round (`discardTransientState`) -- and only that:
 * never a different mode's session, and never any other `dinoquiz:` key
 * (bestScore, maxStreak, scoreMetrics, maxUnlockedLevel, ...), which
 * GameSessionStorage never reads or writes either.
 */

const { gameSessionStorage } = require('./storage');

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

module.exports = {
  hasIncompleteGame,
  discardTransientState,
};
