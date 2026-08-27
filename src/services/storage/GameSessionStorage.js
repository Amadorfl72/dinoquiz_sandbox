'use strict';

const { createIndexedDbAdapter } = require('./adapters/indexedDbAdapter');
const { createLocalStorageAdapter } = require('./adapters/localStorageAdapter');
const { createMemoryAdapter } = require('./adapters/memoryAdapter');
const { LogService } = require('../logging');
const { ROUNDS_PER_GAME } = require('../../game/roundContract');

const NAMESPACE = 'dinoquiz:';
const SESSION_KEY = `${NAMESPACE}session`;

// Bump whenever the persisted shape below changes incompatibly. restoreSession
// discards (rather than tries to migrate/guess) anything saved under an older
// or newer version, so a shape change never hands a stale/foreign session back
// to roundContract.js.
const SESSION_SCHEMA_VERSION = 1;

// The only statuses roundContract.js sessions can resume into (see pauseGame/
// advanceRound in public/scripts/roundContract.js). A 'finished' session has
// nothing left to restore -- its score/aciertos are already folded into the
// separately-keyed bestScore/maxStreak/scoreMetrics this module never touches.
const RESUMABLE_STATUSES = ['playing', 'paused'];

// Stable technical code for a degraded (in-memory-only) session write, mirroring
// StorageClient.js's MAX_UNLOCKED_LEVEL_PERSIST_ERROR_CODE: carries no metadata,
// so it never leaks round content, only that a write degraded to in-memory.
const SESSION_PERSIST_ERROR_CODE = 'storage_session_persist_error';

/**
 * Strips a live roundContract.js session down to its serializable fields
 * (`hooks` and `generateRound` are closures/functions and can never survive
 * JSON.stringify -- a restoring screen re-attaches fresh ones, see
 * `GameSessionStorage#restoreSession`'s doc comment). Returns null if
 * `modeId`/`session` don't look like a real roundContract.js session, so a
 * caller never persists garbage.
 */
function serializeSession(modeId, session) {
  if (typeof modeId !== 'string' || modeId.length === 0) {
    return null;
  }
  if (!session || typeof session !== 'object') {
    return null;
  }
  if (!Number.isInteger(session.roundCount) || !Number.isInteger(session.roundIndex)) {
    return null;
  }
  if (typeof session.status !== 'string') {
    return null;
  }
  if (!session.round || typeof session.round !== 'object') {
    return null;
  }
  if (!session.state || typeof session.state !== 'object' || !Array.isArray(session.state.answers)) {
    return null;
  }

  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    modeId,
    session: {
      roundCount: session.roundCount,
      context: session.context !== undefined ? session.context : null,
      state: session.state,
      roundIndex: session.roundIndex,
      round: session.round,
      status: session.status,
    },
  };
}

/**
 * Validates schema version and shape of a parsed envelope (AC: "valida
 * integridad y versión al recargar"). Deliberately structural rather than a
 * cryptographic checksum -- there is no backend to sign against (PRD: "Sin
 * backend"), so "integrity" here means every field roundContract.js needs to
 * resume is present and internally consistent (e.g. `roundIndex` inside
 * `[0, roundCount)`, and `session.roundIndex` matching `session.round.roundIndex`
 * so restoration can never resume a round other than the one the common
 * contract considers current), not tamper-detection.
 */
function isValidEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    return false;
  }
  if (envelope.schemaVersion !== SESSION_SCHEMA_VERSION) {
    return false;
  }
  if (typeof envelope.modeId !== 'string' || envelope.modeId.length === 0) {
    return false;
  }

  const session = envelope.session;
  if (!session || typeof session !== 'object') {
    return false;
  }
  if (session.roundCount !== ROUNDS_PER_GAME) {
    return false;
  }
  if (!['playing', 'paused', 'finished'].includes(session.status)) {
    return false;
  }
  if (!Number.isInteger(session.roundIndex) || session.roundIndex < 0 || session.roundIndex >= session.roundCount) {
    return false;
  }

  const round = session.round;
  if (!round || typeof round !== 'object' || !Number.isInteger(round.roundIndex) || typeof round.answered !== 'boolean') {
    return false;
  }
  if (round.roundIndex !== session.roundIndex) {
    return false;
  }

  const state = session.state;
  if (!state || typeof state !== 'object') {
    return false;
  }
  if (!Number.isInteger(state.score) || state.score < 0) {
    return false;
  }
  if (!Number.isInteger(state.questionIndex) || state.questionIndex < 0) {
    return false;
  }
  if (!Array.isArray(state.answers)) {
    return false;
  }

  return true;
}

/**
 * Local persistence and versioned restoration of the *in-progress* game
 * session (TRIOFSND-242), i.e. the transient round-by-round state
 * roundContract.js (src/game/roundContract.js) produces -- as distinct from
 * the durable, per-mode progress/results StorageClient.js already persists
 * (bestScore, maxStreak, scoreMetrics, maxUnlockedLevel...), which this
 * module never reads or writes.
 *
 * Storage-key note: this stores exactly one session at a time, under the
 * single namespaced key `dinoquiz:session`, because only one game can be
 * in progress at once (the PRD's "el jugador elegirá el modo antes de
 * comenzar" flow) -- switching modes mid-game is handled explicitly by
 * `discardSession`, never by keeping several sessions around.
 *
 * Non-serializable fields: `hooks` and `generateRound` on a live
 * roundContract.js session are closures and can't survive JSON.stringify.
 * `saveSession` strips them; `restoreSession` hands back the remaining
 * plain-data fields (`roundCount`, `context`, `state`, `roundIndex`, `round`,
 * `status`) and the calling mode screen re-attaches a fresh `hooks` (e.g.
 * `roundContract.createHooks()`) and its own `generateRound` before driving
 * the session further, e.g.:
 *
 *   const restored = await gameSessionStorage.restoreSession(modeId);
 *   const session = restored &&
 *     Object.assign({}, restored, { generateRound, hooks: roundContract.createHooks() });
 *
 * Backend fallback (IndexedDB -> localStorage -> memory) mirrors
 * StorageClient.js so the game stays playable -- just non-resumable -- even
 * when every persistent backend is unavailable.
 */
class GameSessionStorage {
  #adapters;
  #activeAdapter = null;
  #initPromise = null;
  #logService;

  // Aggregated, non-PII observability counters only (mirrors StorageClient.js).
  #failureCount = 0;
  #lastErrorAt = null;

  constructor(
    adapters = [createIndexedDbAdapter(), createLocalStorageAdapter(), createMemoryAdapter()],
    logService = new LogService()
  ) {
    this.#adapters = adapters;
    this.#logService = logService;
  }

  init() {
    if (!this.#initPromise) {
      this.#initPromise = this.#doInit();
    }
    return this.#initPromise;
  }

  async #doInit() {
    for (const adapter of this.#adapters) {
      try {
        if (await adapter.isAvailable()) {
          this.#activeAdapter = adapter;
          return;
        }
      } catch {
        this.#recordFailure();
      }
    }
    this.#activeAdapter = createMemoryAdapter();
  }

  #recordFailure() {
    this.#failureCount += 1;
    this.#lastErrorAt = Date.now();
  }

  /**
   * Writes `value` under the session key, promoting to whichever adapter
   * (in priority order, starting from the currently active one) actually
   * accepts the write -- same degrade-on-failure shape as
   * StorageClient.js#set. Resolves to true only if the write is durable.
   */
  async #write(value) {
    await this.init();

    const activeIndex = this.#activeAdapter ? this.#adapters.indexOf(this.#activeAdapter) : -1;
    const candidates = this.#adapters.slice(Math.max(activeIndex, 0));

    for (const adapter of candidates) {
      try {
        if (adapter !== this.#activeAdapter && !(await adapter.isAvailable())) {
          continue;
        }
        await adapter.setItem(SESSION_KEY, JSON.stringify(value));
        this.#activeAdapter = adapter;
        return true;
      } catch {
        this.#recordFailure();
      }
    }

    this.#activeAdapter = createMemoryAdapter();
    return false;
  }

  async #readRaw() {
    await this.init();
    try {
      return await this.#activeAdapter.getItem(SESSION_KEY);
    } catch {
      this.#recordFailure();
      return null;
    }
  }

  async #readEnvelope() {
    const raw = await this.#readRaw();
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async #clear() {
    await this.init();
    try {
      await this.#activeAdapter.removeItem(SESSION_KEY);
    } catch {
      this.#recordFailure();
    }
  }

  /**
   * Persists `session` (a live roundContract.js session, any status --
   * 'playing', 'paused' or 'finished') as the current game for `modeId`.
   * Resolves to true if the write is durable, false if `modeId`/`session`
   * don't look like a real session (nothing is written) or every storage
   * backend degraded to in-memory this session (a stable, data-free log
   * code is recorded either way, mirroring
   * StorageClient.js#setMaxUnlockedLevel's persistence-failure logging).
   */
  async saveSession(modeId, session) {
    const envelope = serializeSession(modeId, session);
    if (!envelope) {
      return false;
    }

    const persisted = await this.#write(envelope);
    if (!persisted) {
      this.#logService.logEvent(SESSION_PERSIST_ERROR_CODE);
    }
    return persisted;
  }

  /**
   * Restores the current round of the in-progress game for `modeId` (AC:
   * "restaura la ronda actual si el estado es compatible"). Returns the
   * plain-data session fields (see class doc comment for how to re-attach
   * `hooks`/`generateRound`), or null when there is nothing to restore:
   * no session was ever saved, it belongs to a different mode, its JSON is
   * corrupted, its schema version doesn't match this build's, its shape
   * fails validation, or it already finished.
   *
   * Any of those "incompatible" cases also discards the stored entry (AC:
   * "si no lo es descarta únicamente el estado transitorio conservando
   * progreso y resultados completados") -- this only ever removes the
   * `dinoquiz:session` key, never bestScore/maxStreak/scoreMetrics/
   * maxUnlockedLevel/etc., which live under their own keys in
   * StorageClient.js and are untouched here.
   */
  async restoreSession(modeId) {
    const raw = await this.#readRaw();
    if (raw === null) {
      return null;
    }

    let envelope = null;
    try {
      envelope = JSON.parse(raw);
    } catch {
      // Corrupted JSON: fall through to the discard-and-return-null path below.
    }

    if (!isValidEnvelope(envelope) || envelope.modeId !== modeId || !RESUMABLE_STATUSES.includes(envelope.session.status)) {
      await this.#clear();
      return null;
    }

    return envelope.session;
  }

  /**
   * Discards the persisted session (AC: "gestiona el descarte del estado
   * transitorio al cambiar de modo con partida incompleta"). Called with the
   * mode the player is switching *to*: a stored session for that same mode
   * is left untouched (re-entering the mode you just left should still
   * resume it), any other stored session -- necessarily an incomplete game
   * in a different mode, since a finished one is never left resumable -- is
   * cleared. Called with no argument, unconditionally clears whatever is
   * stored (e.g. once a game finishes and there is nothing left to resume).
   */
  async discardSession(nextModeId) {
    if (nextModeId === undefined) {
      await this.#clear();
      return;
    }

    const envelope = await this.#readEnvelope();
    if (envelope === null) {
      return;
    }
    if (isValidEnvelope(envelope) && envelope.modeId === nextModeId) {
      return;
    }

    await this.#clear();
  }

  getDiagnostics() {
    return {
      backend: this.#activeAdapter?.name ?? 'memory',
      isPersistent: (this.#activeAdapter?.name ?? 'memory') !== 'memory',
      failureCount: this.#failureCount,
      lastErrorAt: this.#lastErrorAt,
    };
  }
}

module.exports = {
  GameSessionStorage,
  SESSION_SCHEMA_VERSION,
  SESSION_STORAGE_KEY: SESSION_KEY,
};
