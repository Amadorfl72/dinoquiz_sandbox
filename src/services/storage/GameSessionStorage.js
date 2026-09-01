'use strict';

const { createIndexedDbAdapter } = require('./adapters/indexedDbAdapter');
const { createLocalStorageAdapter } = require('./adapters/localStorageAdapter');
const { createMemoryAdapter } = require('./adapters/memoryAdapter');
const {
  LogService,
  RESTORE_DISCARD_CATEGORY_INVALID,
  RESTORE_DISCARD_CATEGORY_UNSUPPORTED_VERSION,
} = require('../logging');
const diagnostics = require('../diagnostics');
const { ROUNDS_PER_GAME } = require('../../game/roundContract');
const { MODE_STATE_SCHEMA_VERSION } = require('./types');
const { DEFAULT_MIGRATIONS, applyMigrations } = require('./stateMigration');

const NAMESPACE = 'dinoquiz:';
// Mirrors ModeProgressStorage.js's MODE_PROGRESS_KEY_PREFIX: each mode's
// transient round lives under its own `dinoquiz:session:<modeId>` key so
// saving a round for one mode (e.g. 'laberinto') can never overwrite -- or
// later shadow the restore of -- a different mode's in-progress round (e.g.
// 'quiz'), the way a single shared `dinoquiz:session` key used to
// (TRIOFSND-298).
const SESSION_KEY_PREFIX = `${NAMESPACE}session:`;

function sessionKey(modeId) {
  return `${SESSION_KEY_PREFIX}${modeId}`;
}

// Bump whenever the persisted shape below changes incompatibly. restoreSession
// discards (rather than tries to migrate/guess) anything saved under an older
// or newer version, so a shape change never hands a stale/foreign session back
// to roundContract.js. Sourced from types.js's MODE_STATE_SCHEMA_VERSION
// (TRIOFSND-297/298) so this transient, per-mode envelope and
// ModeProgressStorage.js's completed-progress envelope share the same
// versioning source of truth instead of drifting independently.
const SESSION_SCHEMA_VERSION = MODE_STATE_SCHEMA_VERSION;

// The only statuses roundContract.js sessions can resume into (see pauseGame/
// advanceRound in public/scripts/roundContract.js). A 'finished' session has
// nothing left to restore -- its score/aciertos are already folded into the
// separately-keyed bestScore/maxStreak/scoreMetrics this module never touches.
const RESUMABLE_STATUSES = ['playing', 'paused'];

// Stable technical code for a degraded (in-memory-only) session write, mirroring
// StorageClient.js's MAX_UNLOCKED_LEVEL_PERSIST_ERROR_CODE: carries no metadata,
// so it never leaks round content, only that a write degraded to in-memory.
const SESSION_PERSIST_ERROR_CODE = 'storage_session_persist_error';

// Stable technical code for restoreSession() discarding a persisted session as
// incompatible (corrupted JSON, wrong mode, invalid shape -- including a
// migrated-but-still-invalid one --, or already-finished status -- see
// restoreSession's own doc comment for the full list) -- carries no round
// content, only that the affected mode's transient state had to be discarded
// (TRIOFSND-246, PRD "Diagnóstico ... almacenados únicamente en el dispositivo").
const SESSION_DISCARD_INCOMPATIBLE_CODE = 'storage_session_discard_incompatible';

// Stable technical code for restoreSession() discarding a persisted session
// whose schemaVersion has no migration path to SESSION_SCHEMA_VERSION (an
// unknown old version, a version newer than this build's, or a break in the
// stateMigration.js chain) -- distinct from SESSION_DISCARD_INCOMPATIBLE_CODE
// so a non-migratable version is identifiable separately from a structurally
// invalid one (TRIOFSND-300, PRD "Versiones no migrables se descartan de
// forma controlada con un código de incompatibilidad identificable").
const SESSION_DISCARD_UNSUPPORTED_VERSION_CODE = 'storage_session_discard_unsupported_version';

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
 * the durable, per-mode progress/results StorageClient.js and
 * ModeProgressStorage.js already persist (bestScore, maxStreak,
 * scoreMetrics, maxUnlockedLevel, per-mode results/desbloqueos...), which
 * this module never reads or writes (TRIOFSND-298: completed progress and
 * transient state stay under separate `dinoquiz:`-namespaced keys per mode,
 * so one is never read or written as the other).
 *
 * Storage-key note: each mode's in-progress round is stored under its own
 * namespaced key, `dinoquiz:session:<modeId>` (built by `sessionKey`,
 * mirroring ModeProgressStorage.js's per-mode `dinoquiz:modeProgress:<modeId>`
 * keys) -- never a single shared key -- so an in-progress `quiz` round and an
 * in-progress `laberinto` round can both be resumed independently
 * (TRIOFSND-298: "Los niveles/resultados de un modo nunca se leen ni
 * escriben como progreso de otro modo" applies to transient state exactly
 * as much as to completed progress). Switching away from an incomplete
 * round without finishing it is handled explicitly by `discardModeSession`,
 * never by another mode's save silently overwriting it.
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
  #diagnostics;
  #migrations;

  // Aggregated, non-PII observability counters only (mirrors StorageClient.js).
  #failureCount = 0;
  #lastErrorAt = null;

  constructor(
    adapters = [createIndexedDbAdapter(), createLocalStorageAdapter(), createMemoryAdapter()],
    logService = new LogService(),
    diagnosticsService = diagnostics,
    migrations = DEFAULT_MIGRATIONS
  ) {
    this.#adapters = adapters;
    this.#logService = logService;
    this.#diagnostics = diagnosticsService;
    this.#migrations = migrations;
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
   * Writes `value` under `modeId`'s own session key (`sessionKey(modeId)`),
   * promoting to whichever adapter (in priority order, starting from the
   * currently active one) actually accepts the write -- same
   * degrade-on-failure shape as StorageClient.js#set. Resolves to true only
   * if the write is durable. Never touches any other mode's key.
   */
  async #write(modeId, value) {
    await this.init();

    const activeIndex = this.#activeAdapter ? this.#adapters.indexOf(this.#activeAdapter) : -1;
    const candidates = this.#adapters.slice(Math.max(activeIndex, 0));

    for (const adapter of candidates) {
      try {
        if (adapter !== this.#activeAdapter && !(await adapter.isAvailable())) {
          continue;
        }
        await adapter.setItem(sessionKey(modeId), JSON.stringify(value));
        this.#activeAdapter = adapter;
        return true;
      } catch {
        this.#recordFailure();
      }
    }

    this.#activeAdapter = createMemoryAdapter();
    return false;
  }

  async #readRaw(modeId) {
    await this.init();
    try {
      return await this.#activeAdapter.getItem(sessionKey(modeId));
    } catch {
      this.#recordFailure();
      return null;
    }
  }

  async #readEnvelope(modeId) {
    const raw = await this.#readRaw(modeId);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async #clear(modeId) {
    await this.init();
    try {
      await this.#activeAdapter.removeItem(sessionKey(modeId));
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

    const persisted = await this.#write(modeId, envelope);
    if (!persisted) {
      this.#logService.logEvent(SESSION_PERSIST_ERROR_CODE);
    }
    return persisted;
  }

  /**
   * Restores the current round of the in-progress game for `modeId` (AC:
   * "restaura la ronda actual si el estado es compatible"), reading only
   * `modeId`'s own `sessionKey(modeId)` -- so it can never hand back a
   * different mode's in-progress round, and saving another mode's round in
   * the meantime can never have overwritten this one (TRIOFSND-298). Returns
   * the plain-data session fields (see class doc comment for how to
   * re-attach `hooks`/`generateRound`), or null when there is nothing to
   * restore.
   *
   * A stored envelope whose `schemaVersion` doesn't match
   * `SESSION_SCHEMA_VERSION` is first run through stateMigration.js's
   * `applyMigrations` (TRIOFSND-300, PRD "Migración segura de estado ante
   * cambios de versión incompatibles") instead of being discarded outright.
   * Only a *migrated* envelope that then also passes the same integrity
   * check every other envelope does (`isValidEnvelope`, correct `modeId`,
   * resumable `status`) is restored -- a version with no registered
   * migration path is discarded immediately, tagged with the distinct
   * `SESSION_DISCARD_UNSUPPORTED_VERSION_CODE` so it's identifiable apart
   * from a structurally invalid one.
   *
   * Null is also returned -- and the stored entry discarded -- whenever: no
   * session was ever saved for `modeId`, its JSON is corrupted, its shape
   * fails validation (before or after migration), or it already finished.
   *
   * Any of those "incompatible" cases (AC: "si no lo es descarta únicamente
   * el estado transitorio conservando progreso y resultados completados")
   * only ever removes `modeId`'s own `dinoquiz:session:<modeId>` key, never
   * another mode's session key nor bestScore/maxStreak/scoreMetrics/
   * maxUnlockedLevel/etc., which live under their own keys in
   * StorageClient.js/ModeProgressStorage.js and are untouched here. Every
   * such discard also records a structured, local-only restore diagnostic
   * (LogService#logRestoreDiscarded, TRIOFSND-301) with `modeId`, the stable
   * discard `code`, a `category` (`RESTORE_DISCARD_CATEGORY_UNSUPPORTED_VERSION`
   * for a non-migratable version, `RESTORE_DISCARD_CATEGORY_INVALID` for
   * every other case above), the discarded envelope's own `schemaVersion`
   * when known, and today's local date -- never the discarded session's own
   * content (no prompt, answer or context).
   */
  async restoreSession(modeId) {
    const raw = await this.#readRaw(modeId);
    if (raw === null) {
      return null;
    }

    let envelope = null;
    try {
      envelope = JSON.parse(raw);
    } catch {
      // Corrupted JSON: fall through to the discard-and-return-null path below.
    }

    const attemptedSchemaVersion =
      envelope && typeof envelope === 'object' && envelope.schemaVersion !== undefined ? envelope.schemaVersion : null;

    if (envelope && typeof envelope === 'object' && envelope.schemaVersion !== SESSION_SCHEMA_VERSION) {
      const migrated = applyMigrations(envelope, SESSION_SCHEMA_VERSION, this.#migrations);
      if (migrated === null) {
        await this.#clear(modeId);
        this.#logService.logRestoreDiscarded({
          modeId,
          code: SESSION_DISCARD_UNSUPPORTED_VERSION_CODE,
          category: RESTORE_DISCARD_CATEGORY_UNSUPPORTED_VERSION,
          schemaVersion: attemptedSchemaVersion,
        });
        return null;
      }
      envelope = migrated;
    }

    if (!isValidEnvelope(envelope) || envelope.modeId !== modeId || !RESUMABLE_STATUSES.includes(envelope.session.status)) {
      await this.#clear(modeId);
      this.#logService.logRestoreDiscarded({
        modeId,
        code: SESSION_DISCARD_INCOMPATIBLE_CODE,
        category: RESTORE_DISCARD_CATEGORY_INVALID,
        schemaVersion: attemptedSchemaVersion,
      });
      // TRIOFSND-318, PRD failure point "estado de partida descartado": the
      // stable discard code alone, never the discarded session's own content.
      this.#diagnostics.recordError(modeId, 'state', SESSION_DISCARD_INCOMPATIBLE_CODE);
      return null;
    }

    return envelope.session;
  }

  /**
   * Read-only check for `modeId` (TRIOFSND-238, "descartar sólo el estado
   * transitorio al confirmar cambio de modo"): true only if `modeId`'s own
   * `sessionKey(modeId)` holds a session that is still resumable ('playing'
   * or 'paused'), i.e. exactly the case where leaving `modeId` would lose
   * progress and the mode-change confirmation dialog
   * (public/scripts/modeChangeConfirmScreen.js) must be shown. Unlike
   * `restoreSession`, this never writes anything -- asking the question can
   * never itself discard a session, including one belonging to a different
   * mode (which, under its own key, this never even reads).
   */
  async hasIncompleteSession(modeId) {
    const envelope = await this.#readEnvelope(modeId);
    return isValidEnvelope(envelope) && envelope.modeId === modeId && RESUMABLE_STATUSES.includes(envelope.session.status);
  }

  /**
   * Discards the in-progress round for `modeId` specifically (TRIOFSND-238),
   * once the player has confirmed the mode change. A no-op whenever
   * `modeId`'s own session key holds nothing, or a corrupted/invalid
   * envelope -- so this can only ever clear `modeId`'s own
   * `dinoquiz:session:<modeId>` key: never a different mode's session key
   * (each mode's in-progress round is independently persisted and
   * independently discarded, TRIOFSND-298), and never the durable per-mode
   * keys (bestScore/maxStreak/scoreMetrics/maxUnlockedLevel/...) this class
   * never reads or writes.
   */
  async discardModeSession(modeId) {
    const envelope = await this.#readEnvelope(modeId);
    if (isValidEnvelope(envelope) && envelope.modeId === modeId) {
      await this.#clear(modeId);
    }
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
  SESSION_KEY_PREFIX,
  sessionKey,
  SESSION_DISCARD_INCOMPATIBLE_CODE,
  SESSION_DISCARD_UNSUPPORTED_VERSION_CODE,
};
