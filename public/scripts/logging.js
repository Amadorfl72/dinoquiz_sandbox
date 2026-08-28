'use strict';

/**
 * Structured logging service for DinoQuiz (browser-compatible version).
 *
 * Collects and stores structured logs for user access and PWA installation
 * attempts. This version is loaded as a plain <script> in the browser and
 * registers itself on window.DinoQuiz, while also exporting via CommonJS
 * for Node/Jest testing.
 *
 * Supports transmission to a backend via `sendLogs(endpointUrl, options)`
 * which POSTs accumulated logs as JSON. Logs are cleared after successful
 * transmission unless `clearOnSuccess: false` is passed in options.
 *
 * Diagnostics counters (TRIOFSND-230): `logSelectorOpen()`/
 * `getSelectorOpenCount()` track an aggregated, local-only tally of mode
 * selector opens (never sent via sendLogs), and `logModeBlocked(modeId,
 * cause)`/`getModeBlockedLogs()` record a structured `mode_blocked` entry
 * when a mode is blocked, stored under its own local-only key -- never
 * pushed into the transmittable log array, so it is never sent via
 * sendLogs either.
 *
 * Laberinto diagnostics (TRIOFSND-259): the same aggregated, local-only,
 * never-transmitted pattern extended to the Laberinto mode -- `logMazeGameStarted`/
 * `logMazeGameCompleted`/`logMazeGameAbandoned` each tally a per-level count
 * (keyed by the maze difficulty level, `dinoquiz:mazeGamesStartedByLevel` and
 * friends) so a parent/dev can see how many Laberinto games were started vs.
 * actually finished vs. left mid-game at each level, and
 * `logMazeResolvabilityFailure`/`getMazeResolvabilityFailureCount` tally how
 * many times a maze/round could not be generated as solvable (mirrors the
 * raw `maze_generation_failed`/`maze_round_generation_failed` events already
 * logged by src/game/mazeGenerator.js/public/scripts/mazeGame.js, as a single
 * aggregated counter instead of the full per-event log).
 *
 * Mode-change abandon diagnostics (TRIOFSND-239): `logGameAbandonedByMode(modeId)`/
 * `getGamesAbandonedByMode()` tally, per mode id, how many times a player
 * confirmed "cambiar de juego" (public/scripts/modeChangeConfirmScreen.js)
 * while a round was still incomplete (public/scripts/main.js, driven by
 * src/services/gameSessionStorage.js's `hasIncompleteGame`) -- the same
 * aggregated, local-only, never-transmitted counter shape as the Laberinto
 * per-level tallies above, but keyed by mode id instead of level, so it
 * covers every mode (Laberinto keeps its own separate per-level counters
 * for navigating away outright, which this never duplicates or replaces).
 *
 * Round-contract diagnostics (TRIOFSND-246, PRD "Diagnóstico y métricas
 * agregadas almacenadas únicamente en el dispositivo"): generalizes the
 * Laberinto-only per-level counters above to every mode. `logRoundGameStarted
 * (modeId, level)`/`logRoundGameCompleted(modeId, level)`/
 * `logRoundGameAbandoned(modeId, level)` each tally a per-"modeId:level"
 * aggregated count (public/scripts/roundDiagnosticsService.js drives these
 * from src/game/roundContract.js's session hooks), and
 * `logRoundGenerationFailure(modeId, code)`/`logStateDiscarded(modeId, code)`
 * each tally a per-"modeId:code" aggregated count of a stable, machine-
 * readable local failure code -- never any round content (no prompts,
 * creature ids, seeds or answers) -- for a round a mode's own generator
 * could not build (mirrors the existing `maze_generation_failed`/
 * `size_order_round_generation_failed` codes) or a persisted game session
 * src/services/storage/GameSessionStorage.js had to discard as incompatible.
 * Same aggregated, local-only, never-transmitted-by-sendLogs shape as every
 * counter above.
 *
 * Parejas jurásicas diagnostics (TRIOFSND-277, PRD "Diagnóstico y métricas
 * agregadas almacenadas únicamente en el dispositivo"): "partidas
 * iniciadas/completadas ... por nivel de Parejas" and its local board-
 * generation-failure codes are already covered by the generic
 * `logRoundGameStarted`/`logRoundGameCompleted`/`logRoundGameAbandoned`/
 * `logRoundGenerationFailure` above -- Parejas is just another `modeId`
 * ('parejas', src/game/parejasGame.js's MODE_ID) through that same
 * modeId+level/modeId+code family, so this never re-declares a parallel set
 * of Parejas-only counters. Two round-contract-family counters genuinely
 * didn't exist yet and are added here, generalized the same way (any mode,
 * not just Parejas): `logRoundCorrectAnswer(modeId, level)`/
 * `getRoundCorrectAnswersByModeLevel()` tally one more "acierto" (a correct
 * match/answer within a round -- for Parejas, one more matched pair) per
 * "modeId:level", and `logRoundStarsEarned(modeId, level, stars)`/
 * `getRoundStarsEarnedByModeLevel()` tally the running total of stars
 * (resultsScreen.js's 1-3 star tiers) earned per "modeId:level" -- unlike
 * every other counter here this one accumulates an arbitrary non-negative
 * amount per call (`_addToLevelCount`) instead of always +1, since a single
 * game awards 1-3 stars at once. A third counter,
 * `logRoundGridLimitViolation(modeId, code)`/
 * `getRoundGridLimitViolationCounts()`, tallies per "modeId:code" a stable,
 * machine-readable local code for a hard rejilla/grid limit a mode enforced
 * (e.g. Parejas' MAX_VISIBLE_UNMATCHED reveal cap in
 * src/game/parejasGame.js's `revealCard`) -- kept in its own bucket rather
 * than folded into `logRoundGenerationFailure`'s codes because a limit
 * violation is a runtime rule the UI should never have let happen (a stuck
 * click handler, a stale board), not a generator that failed to build a
 * round in the first place. Same aggregated, local-only,
 * never-transmitted-by-sendLogs shape as every counter above.
 *
 * Clasifica diagnóstico y métricas agregadas (TRIOFSND-283, PRD "Diagnóstico
 * y métricas agregadas almacenadas únicamente en el dispositivo"): unlike
 * every generic per-"modeId:level" counter above, Clasifica's results screen
 * needs a *derived* percentage/estrellas-promedio per level from integer
 * totals (never an average of previously-rounded percentages -- see
 * `getClasificaLevelStats`), and the "one completed game" event must be
 * idempotent by the caller's own local match id (a screen may call the
 * register operation more than once for the same finished game). Neither
 * property exists on the generic counters above, so this is a dedicated,
 * small pair of local-only, never-transmitted stores instead of overloading
 * them:
 *
 * `recordClasificaGame({ matchId, level, correct, stars })` validates its
 * input (`matchId` a non-empty string, `level` present, `correct` an integer
 * 0-10, `stars` one of scoring.js's own `PERCENTAGE_STAR_TIERS` values --
 * this never defines an alternate star scale, only validates the one the
 * shared results contract produces) and, the first time a given `matchId` is
 * seen, adds one to that level's `partidasCompletadas` and folds `correct`/
 * `stars` into that level's integer totals (`dinoquiz:clasificaLevelStats`).
 * A repeat call with an already-seen `matchId` (tracked in
 * `dinoquiz:clasificaProcessedMatchIds`, rotated at MAX_LOGS like every other
 * array here) is a no-op -- registering the same finished game twice leaves
 * the stored state identical to registering it once. An invalid call mutates
 * nothing. `getClasificaLevelStats(level)`/`getClasificaAggregates()` derive
 * `porcentajeAciertos` (`100 * totalAciertos / (10 * partidasCompletadas)`)
 * and `estrellasPromedio` (`totalEstrellas / partidasCompletadas`) from the
 * stored integer totals on every read, both `0` (never `NaN`/`Infinity`)
 * with zero completed games -- never persisted pre-rounded, so precision is
 * never lost.
 *
 * `recordClasificaDiagnostic({ code, level, creatureId, context })` covers
 * the round's own controlled guard (a missing creature card, or one whose
 * diet isn't carnivoro/herbivoro/omnivoro) -- the only two codes this scope
 * defines, exported as `CLASIFICA_MISSING_CREATURE_RECORD`/
 * `CLASIFICA_INVALID_DIET`; never a cronómetro/timing code, none is defined
 * for this scope. Entries are structured (`code`, `mode: 'clasifica'`,
 * `level`, `creatureId`, a local timestamp, non-sensitive technical
 * `context`) and stored under their own `dinoquiz:clasificaDiagnostics` key,
 * same array-with-MAX_LOGS-rotation shape as `modeBlockedLogs` above --
 * never the player's chosen category, never pushed into the transmittable
 * `logs` array, so never reachable via `getLogsPayload()`/`sendLogs()`.
 * Recording a diagnostic never touches `clasificaLevelStats` -- a blocked
 * round is not a completed game.
 *
 * `clearLogs()` -- the diagnostics service's existing local reset operation
 * -- also wipes all three Clasifica stores below (unlike the generic
 * counters above, which `clearLogs()` deliberately leaves alone), so a
 * parent/dev reset clears Clasifica's aggregates the same way it clears the
 * transmittable log array.
 *
 * Oído Jurásico diagnostics and aggregated metrics (TRIOFSND-271, PRD
 * "Diagnóstico y métricas agregadas almacenadas únicamente en el
 * dispositivo"): its partidas iniciadas/completadas/abandonadas por nivel
 * and aciertos/estrellas reuse the same generic round-contract-family
 * counters as Parejas above (`OIDO_JURASICO_MODE_ID` is just another
 * modeId through that family), so this never re-declares a parallel set of
 * Oído-Jurásico-only counters for those. `logOidoJurasicoPlaybackError(code)`/
 * `getOidoJurasicoPlaybackErrors()` record one entry per failed attempt to
 * play the round's sound (oidoJurasicoAudioService.js's `STATUS.ERROR`) --
 * only a stable `code` (`OIDO_JURASICO_AUDIO_UNAVAILABLE`/
 * `OIDO_JURASICO_PLAYBACK_FAILED`, the audio service's only two failure
 * branches), `mode` and today's local calendar date, never the round's
 * creature id, sound file or any other player content.
 * `logOidoJurasicoMissingCacheResource(resourceId)`/
 * `getOidoJurasicoMissingCacheResourceCounts()` tally, per precached sound
 * file path, how many times it was looked for in the Cache Storage precache
 * (service-worker.js's `PRECACHE_URLS`) and not found. Same aggregated,
 * local-only, never-transmitted-by-sendLogs shape as every counter above;
 * neither store is reset by `clearLogs()` (same choice as the generic
 * round-contract counters and `modeBlockedLogs`).
 *
 * Browser bridge: Without a bundler, this follows the dual CommonJS/global
 * pattern as public/scripts/audio.js — registers on window.DinoQuiz for
 * the browser and module.exports for Node/Jest. The canonical
 * src/services/logging/index.js re-exports this file.
 *
 * Catalog validation cause codes (TRIOFSND-223, PRD foundation "Ficha única
 * y verificable para todas las criaturas jugables"): src/data/creatureCatalog.js's
 * `validateCatalog()` logs one `logEvent(cause, { id, rule })` per structured
 * violation it finds in public/data/creatures.json, using one of the three
 * `CATALOG_*_CAUSE` codes exported below instead of a free-text message --
 * `id` is the affected creature's catalog id and `rule` the violated field/
 * check name, never a human-readable sentence or other identifiable data.
 * These are plain eventType strings for the existing generic `logEvent()`
 * (mirrors questionBank.js's unexported `'content_validation_failed'`
 * literal); exported here only so creatureCatalog.js and its tests reference
 * a shared constant instead of duplicating the string.
 */

(function () {
  var CATALOG_FIELD_INVALID_CAUSE = 'catalog_field_invalid';
  var CATALOG_REFERENCE_BROKEN_CAUSE = 'catalog_reference_broken';
  var CATALOG_DUPLICATE_ID_CAUSE = 'catalog_duplicate_id';
  var LOGS_STORAGE_KEY = 'dinoquiz:logs';
  var SELECTOR_OPEN_COUNT_KEY = 'dinoquiz:selectorOpenCount';
  var MODE_BLOCKED_LOGS_STORAGE_KEY = 'dinoquiz:modeBlockedLogs';
  var MAZE_GAMES_STARTED_KEY = 'dinoquiz:mazeGamesStartedByLevel';
  var MAZE_GAMES_COMPLETED_KEY = 'dinoquiz:mazeGamesCompletedByLevel';
  var MAZE_GAMES_ABANDONED_KEY = 'dinoquiz:mazeGamesAbandonedByLevel';
  var MAZE_RESOLVABILITY_FAILURE_COUNT_KEY = 'dinoquiz:mazeResolvabilityFailureCount';
  var GAMES_ABANDONED_BY_MODE_KEY = 'dinoquiz:gamesAbandonedByMode';
  var ROUND_GAMES_STARTED_KEY = 'dinoquiz:roundGamesStartedByModeLevel';
  var ROUND_GAMES_COMPLETED_KEY = 'dinoquiz:roundGamesCompletedByModeLevel';
  var ROUND_GAMES_ABANDONED_KEY = 'dinoquiz:roundGamesAbandonedByModeLevel';
  var ROUND_GENERATION_FAILURE_CODES_KEY = 'dinoquiz:roundGenerationFailureCodes';
  var STATE_DISCARD_CODES_KEY = 'dinoquiz:stateDiscardCodes';
  var ROUND_CORRECT_ANSWERS_KEY = 'dinoquiz:roundCorrectAnswersByModeLevel';
  var ROUND_STARS_EARNED_KEY = 'dinoquiz:roundStarsEarnedByModeLevel';
  var ROUND_GRID_LIMIT_VIOLATION_CODES_KEY = 'dinoquiz:roundGridLimitViolationCodes';
  var CLASIFICA_LEVEL_STATS_KEY = 'dinoquiz:clasificaLevelStats';
  var CLASIFICA_PROCESSED_MATCH_IDS_KEY = 'dinoquiz:clasificaProcessedMatchIds';
  var CLASIFICA_DIAGNOSTICS_KEY = 'dinoquiz:clasificaDiagnostics';
  var OIDO_JURASICO_PLAYBACK_ERRORS_KEY = 'dinoquiz:oidoJurasicoPlaybackErrors';
  var OIDO_JURASICO_MISSING_CACHE_RESOURCE_COUNTS_KEY = 'dinoquiz:oidoJurasicoMissingCacheResourceCounts';
  var MAX_LOGS = 1000;
  var LOG_VERSION = '1.0';

  var CLASIFICA_MODE_ID = 'clasifica';
  var CLASIFICA_ROUNDS_PER_GAME = 10;

  // The only two diagnostic codes this scope defines -- no cronómetro/timing
  // code exists, none should be invented here (PRD "Diagnóstico y métricas
  // agregadas ... locales de Clasifica").
  var CLASIFICA_MISSING_CREATURE_RECORD = 'CLASIFICA_MISSING_CREATURE_RECORD';
  var CLASIFICA_INVALID_DIET = 'CLASIFICA_INVALID_DIET';
  var CLASIFICA_DIAGNOSTIC_CODES = Object.freeze([CLASIFICA_MISSING_CREATURE_RECORD, CLASIFICA_INVALID_DIET]);

  var OIDO_JURASICO_MODE_ID = 'oidoJurasico';

  // The only two failure branches oidoJurasicoAudioService.js's `attempt()`
  // ever reports (TRIOFSND-271): no audio source/player available at all, or
  // an available player that failed to start/continue (Audio() construction
  // throwing, or play() rejecting/throwing synchronously). No cronómetro/
  // timing code exists for this scope, none should be invented here.
  var OIDO_JURASICO_AUDIO_UNAVAILABLE = 'OIDO_JURASICO_AUDIO_UNAVAILABLE';
  var OIDO_JURASICO_PLAYBACK_FAILED = 'OIDO_JURASICO_PLAYBACK_FAILED';
  var OIDO_JURASICO_PLAYBACK_ERROR_CODES = Object.freeze([OIDO_JURASICO_AUDIO_UNAVAILABLE, OIDO_JURASICO_PLAYBACK_FAILED]);

  function generateRequestId() {
    return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function createLogEntry(eventType, metadata) {
    metadata = metadata || {};

    return {
      version: LOG_VERSION,
      timestamp: new Date().toISOString(),
      eventType: eventType,
      requestId: generateRequestId(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      platform: detectPlatform(),
      metadata: metadata,
    };
  }

  function detectPlatform() {
    if (typeof navigator === 'undefined') {
      return 'unknown';
    }

    var ua = navigator.userAgent;

    if (/iPad/.test(ua)) return 'tablet_ios';
    if (/Android/.test(ua) && /Mobile/.test(ua)) return 'mobile_android';
    if (/Android/.test(ua)) return 'tablet_android';
    if (/iPhone|iPod/.test(ua)) return 'mobile_ios';
    if (/Windows/.test(ua)) return 'windows';
    if (/Mac/.test(ua)) return 'macos';
    if (/Linux/.test(ua)) return 'linux';
    if (/Chrome OS/.test(ua)) return 'chromeos';

    return 'unknown';
  }

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /** `YYYY-MM-DD` from the device's local calendar (getFullYear/getMonth/getDate, never the UTC getters) -- deliberately date-only, no time-of-day, for the Oído Jurásico playback-error diagnostics below (TRIOFSND-271). */
  function localDateString(dateObj) {
    var d = dateObj instanceof Date ? dateObj : new Date();
    var month = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return d.getFullYear() + '-' + month + '-' + day;
  }

  /** Resolves scoring.js under Node/Jest via `require`, or `window.DinoQuiz.scoring` in the browser -- same fallback shape as roundDiagnosticsService.js's own resolveRoundContract. */
  function resolveScoring(options) {
    options = options || {};
    if (options.scoring) {
      return options.scoring;
    }
    if (typeof require === 'function') {
      try {
        return require('./scoring');
      } catch (error) {
        return null;
      }
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.scoring) || null;
  }

  /** Validates `stars` against scoring.js's own PERCENTAGE_STAR_TIERS values -- never a locally-defined alternate scale. Fails closed (rejects) if scoring.js can't be resolved, rather than guessing a fallback range. */
  function isValidClasificaStars(stars, options) {
    if (!Number.isInteger(stars)) {
      return false;
    }
    var scoringModule = resolveScoring(options);
    if (!scoringModule || !Array.isArray(scoringModule.PERCENTAGE_STAR_TIERS)) {
      return false;
    }
    return scoringModule.PERCENTAGE_STAR_TIERS.some(function (tier) {
      return tier.stars === stars;
    });
  }

  function createLocalStorageAdapter() {
    return {
      getItem: function (key) {
        if (typeof localStorage === 'undefined') {
          return null;
        }
        try {
          return localStorage.getItem(key);
        } catch (error) {
          return null;
        }
      },
      setItem: function (key, value) {
        if (typeof localStorage === 'undefined') {
          return;
        }
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('DinoQuiz: failed to write to localStorage', error);
        }
      },
    };
  }

  function createMemoryAdapter() {
    var store = {};
    return {
      getItem: function (key) {
        return store[key] || null;
      },
      setItem: function (key, value) {
        store[key] = value;
      },
    };
  }

  function LogService(storageAdapter) {
    this.storageAdapter = storageAdapter || createLocalStorageAdapter();
    this.logs = this._loadLogs();
    this.selectorOpenCount = this._loadSelectorOpenCount();
    this.modeBlockedLogs = this._loadModeBlockedLogs();
    this.mazeGamesStartedByLevel = this._loadLevelCounts(MAZE_GAMES_STARTED_KEY);
    this.mazeGamesCompletedByLevel = this._loadLevelCounts(MAZE_GAMES_COMPLETED_KEY);
    this.mazeGamesAbandonedByLevel = this._loadLevelCounts(MAZE_GAMES_ABANDONED_KEY);
    this.mazeResolvabilityFailureCount = this._loadMazeResolvabilityFailureCount();
    this.gamesAbandonedByMode = this._loadLevelCounts(GAMES_ABANDONED_BY_MODE_KEY);
    this.roundGamesStartedByModeLevel = this._loadLevelCounts(ROUND_GAMES_STARTED_KEY);
    this.roundGamesCompletedByModeLevel = this._loadLevelCounts(ROUND_GAMES_COMPLETED_KEY);
    this.roundGamesAbandonedByModeLevel = this._loadLevelCounts(ROUND_GAMES_ABANDONED_KEY);
    this.roundGenerationFailureCounts = this._loadLevelCounts(ROUND_GENERATION_FAILURE_CODES_KEY);
    this.stateDiscardCounts = this._loadLevelCounts(STATE_DISCARD_CODES_KEY);
    this.roundCorrectAnswersByModeLevel = this._loadLevelCounts(ROUND_CORRECT_ANSWERS_KEY);
    this.roundStarsEarnedByModeLevel = this._loadLevelCounts(ROUND_STARS_EARNED_KEY);
    this.roundGridLimitViolationCounts = this._loadLevelCounts(ROUND_GRID_LIMIT_VIOLATION_CODES_KEY);
    this.clasificaLevelStats = this._loadClasificaLevelStats();
    this.clasificaProcessedMatchIds = this._loadClasificaProcessedMatchIds();
    this.clasificaDiagnostics = this._loadClasificaDiagnostics();
    this.oidoJurasicoPlaybackErrors = this._loadOidoJurasicoPlaybackErrors();
    this.oidoJurasicoMissingCacheResourceCounts = this._loadLevelCounts(OIDO_JURASICO_MISSING_CACHE_RESOURCE_COUNTS_KEY);
  }

  LogService.prototype._loadLogs = function () {
    try {
      var stored = this.storageAdapter.getItem(LOGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('DinoQuiz: failed to load logs from storage', error);
      return [];
    }
  };

  LogService.prototype._saveLogs = function () {
    try {
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS);
      }
      this.storageAdapter.setItem(LOGS_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('DinoQuiz: failed to save logs to storage', error);
    }
  };

  LogService.prototype.logEvent = function (eventType, metadata) {
    if (!eventType || typeof eventType !== 'string') {
      console.warn('DinoQuiz: logEvent requires a valid eventType');
      return;
    }

    var entry = createLogEntry(eventType, metadata);
    this.logs.push(entry);
    this._saveLogs();
  };

  LogService.prototype._loadSelectorOpenCount = function () {
    try {
      var stored = this.storageAdapter.getItem(SELECTOR_OPEN_COUNT_KEY);
      var count = stored ? JSON.parse(stored) : 0;
      return Number.isInteger(count) && count >= 0 ? count : 0;
    } catch (error) {
      console.warn('DinoQuiz: failed to load selector open count from storage', error);
      return 0;
    }
  };

  LogService.prototype._saveSelectorOpenCount = function () {
    try {
      this.storageAdapter.setItem(SELECTOR_OPEN_COUNT_KEY, JSON.stringify(this.selectorOpenCount));
    } catch (error) {
      console.error('DinoQuiz: failed to save selector open count to storage', error);
    }
  };

  LogService.prototype.logSelectorOpen = function () {
    this.selectorOpenCount += 1;
    this._saveSelectorOpenCount();
    return this.selectorOpenCount;
  };

  LogService.prototype.getSelectorOpenCount = function () {
    return this.selectorOpenCount;
  };

  LogService.prototype._loadModeBlockedLogs = function () {
    try {
      var stored = this.storageAdapter.getItem(MODE_BLOCKED_LOGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('DinoQuiz: failed to load mode-blocked logs from storage', error);
      return [];
    }
  };

  LogService.prototype._saveModeBlockedLogs = function () {
    try {
      if (this.modeBlockedLogs.length > MAX_LOGS) {
        this.modeBlockedLogs = this.modeBlockedLogs.slice(-MAX_LOGS);
      }
      this.storageAdapter.setItem(MODE_BLOCKED_LOGS_STORAGE_KEY, JSON.stringify(this.modeBlockedLogs));
    } catch (error) {
      console.error('DinoQuiz: failed to save mode-blocked logs to storage', error);
    }
  };

  LogService.prototype.logModeBlocked = function (modeId, cause) {
    if (typeof modeId !== 'string' || modeId.length === 0) {
      console.warn('DinoQuiz: logModeBlocked requires a valid modeId');
      return;
    }
    var entry = createLogEntry('mode_blocked', { modeId: modeId, cause: cause || null });
    this.modeBlockedLogs.push(entry);
    this._saveModeBlockedLogs();
  };

  LogService.prototype.getModeBlockedLogs = function () {
    return this.modeBlockedLogs.slice();
  };

  /** Reads a `{ [level]: count }` map from storage, defaulting to `{}` for anything missing/corrupted. */
  LogService.prototype._loadLevelCounts = function (key) {
    try {
      var stored = this.storageAdapter.getItem(key);
      var counts = stored ? JSON.parse(stored) : {};
      return counts && typeof counts === 'object' && !Array.isArray(counts) ? counts : {};
    } catch (error) {
      console.warn('DinoQuiz: failed to load key from storage', key, error);
      return {};
    }
  };

  LogService.prototype._saveLevelCounts = function (key, counts) {
    try {
      this.storageAdapter.setItem(key, JSON.stringify(counts));
    } catch (error) {
      console.error('DinoQuiz: failed to save key to storage', key, error);
    }
  };

  /** Increments `counts[level]` by one, persists it under `key`, and returns the new count. */
  LogService.prototype._incrementLevelCount = function (key, counts, level) {
    return this._addToLevelCount(key, counts, level, 1);
  };

  /** Adds `amount` to `counts[level]`, persists it under `key`, and returns the new total. */
  LogService.prototype._addToLevelCount = function (key, counts, level, amount) {
    var levelKey = String(level);
    counts[levelKey] = (counts[levelKey] || 0) + amount;
    this._saveLevelCounts(key, counts);
    return counts[levelKey];
  };

  /** Tallies one more Laberinto game started at `level` (PRD "Diagnóstico ... almacenado únicamente en el dispositivo"). */
  LogService.prototype.logMazeGameStarted = function (level) {
    return this._incrementLevelCount(MAZE_GAMES_STARTED_KEY, this.mazeGamesStartedByLevel, level);
  };

  LogService.prototype.getMazeGamesStartedByLevel = function () {
    return Object.assign({}, this.mazeGamesStartedByLevel);
  };

  /** Tallies one more Laberinto game completed (all ROUNDS_PER_GAME rounds reached their goal) at `level`. */
  LogService.prototype.logMazeGameCompleted = function (level) {
    return this._incrementLevelCount(MAZE_GAMES_COMPLETED_KEY, this.mazeGamesCompletedByLevel, level);
  };

  LogService.prototype.getMazeGamesCompletedByLevel = function () {
    return Object.assign({}, this.mazeGamesCompletedByLevel);
  };

  /** Tallies one more Laberinto game left before it was completed (e.g. navigating back to Inicio mid-game) at `level`. */
  LogService.prototype.logMazeGameAbandoned = function (level) {
    return this._incrementLevelCount(MAZE_GAMES_ABANDONED_KEY, this.mazeGamesAbandonedByLevel, level);
  };

  LogService.prototype.getMazeGamesAbandonedByLevel = function () {
    return Object.assign({}, this.mazeGamesAbandonedByLevel);
  };

  LogService.prototype._loadMazeResolvabilityFailureCount = function () {
    try {
      var stored = this.storageAdapter.getItem(MAZE_RESOLVABILITY_FAILURE_COUNT_KEY);
      var count = stored ? JSON.parse(stored) : 0;
      return Number.isInteger(count) && count >= 0 ? count : 0;
    } catch (error) {
      console.warn('DinoQuiz: failed to load maze resolvability failure count from storage', error);
      return 0;
    }
  };

  LogService.prototype._saveMazeResolvabilityFailureCount = function () {
    try {
      this.storageAdapter.setItem(MAZE_RESOLVABILITY_FAILURE_COUNT_KEY, JSON.stringify(this.mazeResolvabilityFailureCount));
    } catch (error) {
      console.error('DinoQuiz: failed to save maze resolvability failure count to storage', error);
    }
  };

  /** Tallies one more maze/round that could not be generated as solvable (mirrors the raw maze_generation_failed/maze_round_generation_failed events). */
  LogService.prototype.logMazeResolvabilityFailure = function () {
    this.mazeResolvabilityFailureCount += 1;
    this._saveMazeResolvabilityFailureCount();
    return this.mazeResolvabilityFailureCount;
  };

  LogService.prototype.getMazeResolvabilityFailureCount = function () {
    return this.mazeResolvabilityFailureCount;
  };

  /** Tallies one more confirmed "cambiar de juego" (TRIOFSND-239) that discarded an incomplete round for `modeId`. */
  LogService.prototype.logGameAbandonedByMode = function (modeId) {
    return this._incrementLevelCount(GAMES_ABANDONED_BY_MODE_KEY, this.gamesAbandonedByMode, modeId);
  };

  LogService.prototype.getGamesAbandonedByMode = function () {
    return Object.assign({}, this.gamesAbandonedByMode);
  };

  /** Builds the composite "modeId:suffix" key the round-contract diagnostics counters below are aggregated under. */
  LogService.prototype._modeKey = function (modeId, suffix) {
    return modeId + ':' + suffix;
  };

  /** Tallies one more roundContract.js game started for `modeId` at `level` (TRIOFSND-246). */
  LogService.prototype.logRoundGameStarted = function (modeId, level) {
    return this._incrementLevelCount(ROUND_GAMES_STARTED_KEY, this.roundGamesStartedByModeLevel, this._modeKey(modeId, level));
  };

  LogService.prototype.getRoundGamesStartedByModeLevel = function () {
    return Object.assign({}, this.roundGamesStartedByModeLevel);
  };

  /** Tallies one more roundContract.js game completed (reached `game:over`) for `modeId` at `level`. */
  LogService.prototype.logRoundGameCompleted = function (modeId, level) {
    return this._incrementLevelCount(ROUND_GAMES_COMPLETED_KEY, this.roundGamesCompletedByModeLevel, this._modeKey(modeId, level));
  };

  LogService.prototype.getRoundGamesCompletedByModeLevel = function () {
    return Object.assign({}, this.roundGamesCompletedByModeLevel);
  };

  /** Tallies one more roundContract.js game left before `game:over` for `modeId` at `level` (e.g. navigating away mid-round). */
  LogService.prototype.logRoundGameAbandoned = function (modeId, level) {
    return this._incrementLevelCount(ROUND_GAMES_ABANDONED_KEY, this.roundGamesAbandonedByModeLevel, this._modeKey(modeId, level));
  };

  LogService.prototype.getRoundGamesAbandonedByModeLevel = function () {
    return Object.assign({}, this.roundGamesAbandonedByModeLevel);
  };

  /** Tallies one more local round-generation failure for `modeId`, identified only by a stable, machine-readable `code` (never round content). */
  LogService.prototype.logRoundGenerationFailure = function (modeId, code) {
    if (typeof code !== 'string' || code.length === 0) {
      console.warn('DinoQuiz: logRoundGenerationFailure requires a valid code');
      return 0;
    }
    return this._incrementLevelCount(ROUND_GENERATION_FAILURE_CODES_KEY, this.roundGenerationFailureCounts, this._modeKey(modeId, code));
  };

  LogService.prototype.getRoundGenerationFailureCounts = function () {
    return Object.assign({}, this.roundGenerationFailureCounts);
  };

  /** Tallies one more local state-discard for `modeId`, identified only by a stable, machine-readable `code` (never round content). */
  LogService.prototype.logStateDiscarded = function (modeId, code) {
    if (typeof code !== 'string' || code.length === 0) {
      console.warn('DinoQuiz: logStateDiscarded requires a valid code');
      return 0;
    }
    return this._incrementLevelCount(STATE_DISCARD_CODES_KEY, this.stateDiscardCounts, this._modeKey(modeId, code));
  };

  LogService.prototype.getStateDiscardCounts = function () {
    return Object.assign({}, this.stateDiscardCounts);
  };

  /** Tallies one more "acierto" (a correct match/answer within a round -- for Parejas, one more matched pair) for `modeId` at `level` (TRIOFSND-277). */
  LogService.prototype.logRoundCorrectAnswer = function (modeId, level) {
    return this._incrementLevelCount(ROUND_CORRECT_ANSWERS_KEY, this.roundCorrectAnswersByModeLevel, this._modeKey(modeId, level));
  };

  LogService.prototype.getRoundCorrectAnswersByModeLevel = function () {
    return Object.assign({}, this.roundCorrectAnswersByModeLevel);
  };

  /** Adds `stars` (a non-negative integer, e.g. resultsScreen.js's 1-3 star tiers) to the running total for `modeId` at `level`. */
  LogService.prototype.logRoundStarsEarned = function (modeId, level, stars) {
    if (!Number.isInteger(stars) || stars < 0) {
      console.warn('DinoQuiz: logRoundStarsEarned requires a non-negative integer stars count');
      return 0;
    }
    return this._addToLevelCount(ROUND_STARS_EARNED_KEY, this.roundStarsEarnedByModeLevel, this._modeKey(modeId, level), stars);
  };

  LogService.prototype.getRoundStarsEarnedByModeLevel = function () {
    return Object.assign({}, this.roundStarsEarnedByModeLevel);
  };

  /** Tallies one more local hard rejilla/grid-limit violation for `modeId`, identified only by a stable, machine-readable `code` (e.g. Parejas' MAX_VISIBLE_UNMATCHED reveal cap -- never any round content). */
  LogService.prototype.logRoundGridLimitViolation = function (modeId, code) {
    if (typeof code !== 'string' || code.length === 0) {
      console.warn('DinoQuiz: logRoundGridLimitViolation requires a valid code');
      return 0;
    }
    return this._incrementLevelCount(ROUND_GRID_LIMIT_VIOLATION_CODES_KEY, this.roundGridLimitViolationCounts, this._modeKey(modeId, code));
  };

  LogService.prototype.getRoundGridLimitViolationCounts = function () {
    return Object.assign({}, this.roundGridLimitViolationCounts);
  };

  /** Reads `{ [level]: { partidasCompletadas, totalAciertos, totalEstrellas } }`, defaulting to `{}` for anything missing/corrupted -- never lets a bad entry for one level erase another mode's data (a different key entirely). */
  LogService.prototype._loadClasificaLevelStats = function () {
    try {
      var stored = this.storageAdapter.getItem(CLASIFICA_LEVEL_STATS_KEY);
      var parsed = stored ? JSON.parse(stored) : {};
      return isPlainObject(parsed) ? parsed : {};
    } catch (error) {
      console.warn('DinoQuiz: failed to load Clasifica level stats from storage', error);
      return {};
    }
  };

  LogService.prototype._saveClasificaLevelStats = function () {
    try {
      this.storageAdapter.setItem(CLASIFICA_LEVEL_STATS_KEY, JSON.stringify(this.clasificaLevelStats));
    } catch (error) {
      console.error('DinoQuiz: failed to save Clasifica level stats to storage', error);
    }
  };

  LogService.prototype._loadClasificaProcessedMatchIds = function () {
    try {
      var stored = this.storageAdapter.getItem(CLASIFICA_PROCESSED_MATCH_IDS_KEY);
      var parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('DinoQuiz: failed to load Clasifica processed match ids from storage', error);
      return [];
    }
  };

  /** Same MAX_LOGS rotation as every other array this file persists -- a match id old enough to have rotated out is documented as out of scope for repeat-idempotency (see class doc comment): `recordClasificaGame` is expected to run once per finished game, not retried across many later games. */
  LogService.prototype._saveClasificaProcessedMatchIds = function () {
    try {
      if (this.clasificaProcessedMatchIds.length > MAX_LOGS) {
        this.clasificaProcessedMatchIds = this.clasificaProcessedMatchIds.slice(-MAX_LOGS);
      }
      this.storageAdapter.setItem(CLASIFICA_PROCESSED_MATCH_IDS_KEY, JSON.stringify(this.clasificaProcessedMatchIds));
    } catch (error) {
      console.error('DinoQuiz: failed to save Clasifica processed match ids to storage', error);
    }
  };

  LogService.prototype._loadClasificaDiagnostics = function () {
    try {
      var stored = this.storageAdapter.getItem(CLASIFICA_DIAGNOSTICS_KEY);
      var parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('DinoQuiz: failed to load Clasifica diagnostics from storage', error);
      return [];
    }
  };

  LogService.prototype._saveClasificaDiagnostics = function () {
    try {
      if (this.clasificaDiagnostics.length > MAX_LOGS) {
        this.clasificaDiagnostics = this.clasificaDiagnostics.slice(-MAX_LOGS);
      }
      this.storageAdapter.setItem(CLASIFICA_DIAGNOSTICS_KEY, JSON.stringify(this.clasificaDiagnostics));
    } catch (error) {
      console.error('DinoQuiz: failed to save Clasifica diagnostics to storage', error);
    }
  };

  /**
   * Registers the aggregated result of one completed Clasifica game (exactly
   * ROUNDS_PER_GAME rounds evaluated) at `level`: `matchId` (a non-empty
   * string local match id, required), `level` (required), `correct` (an
   * integer 0-10) and `stars` (validated against scoring.js's own star
   * scale, never a locally-defined one). Rejects -- without mutating any
   * stored aggregate -- when any field is missing or out of range.
   *
   * Idempotent by `matchId`: the first call for a given id adds one to that
   * level's `partidasCompletadas` and folds `correct`/`stars` into that
   * level's integer totals; every later call with the same `matchId` is a
   * no-op that still returns `true` (the game is, correctly, registered).
   * Never stores the round-by-round answers or the player's chosen category
   * -- only the three integer totals per level.
   */
  LogService.prototype.recordClasificaGame = function (params) {
    params = params || {};
    var matchId = params.matchId;
    var level = params.level;
    var correct = params.correct;
    var stars = params.stars;

    if (typeof matchId !== 'string' || matchId.length === 0) {
      console.warn('DinoQuiz: recordClasificaGame requires a valid matchId');
      return false;
    }
    if (level === undefined || level === null || level === '') {
      console.warn('DinoQuiz: recordClasificaGame requires a valid level');
      return false;
    }
    if (!Number.isInteger(correct) || correct < 0 || correct > CLASIFICA_ROUNDS_PER_GAME) {
      console.warn('DinoQuiz: recordClasificaGame requires correct to be an integer between 0 and ' + CLASIFICA_ROUNDS_PER_GAME);
      return false;
    }
    if (!isValidClasificaStars(stars, params)) {
      console.warn('DinoQuiz: recordClasificaGame requires a stars value from the shared results scale');
      return false;
    }

    if (this.clasificaProcessedMatchIds.indexOf(matchId) !== -1) {
      return true;
    }

    var levelKey = String(level);
    var current = this.clasificaLevelStats[levelKey] || { partidasCompletadas: 0, totalAciertos: 0, totalEstrellas: 0 };
    this.clasificaLevelStats[levelKey] = {
      partidasCompletadas: current.partidasCompletadas + 1,
      totalAciertos: current.totalAciertos + correct,
      totalEstrellas: current.totalEstrellas + stars,
    };
    this._saveClasificaLevelStats();

    this.clasificaProcessedMatchIds.push(matchId);
    this._saveClasificaProcessedMatchIds();

    return true;
  };

  /**
   * Derives `{ partidasCompletadas, porcentajeAciertos, estrellasPromedio }`
   * for `level` from the stored integer totals -- never from a previously
   * persisted percentage. `porcentajeAciertos` is
   * `100 * totalAciertos / (10 * partidasCompletadas)`, `estrellasPromedio`
   * is `totalEstrellas / partidasCompletadas`; both `0` (never `NaN`/
   * `Infinity`) when `partidasCompletadas` is `0`. Rounding for display is
   * left to the caller.
   */
  LogService.prototype.getClasificaLevelStats = function (level) {
    var levelKey = String(level);
    var stats = this.clasificaLevelStats[levelKey];
    var partidasCompletadas = (stats && stats.partidasCompletadas) || 0;
    var totalAciertos = (stats && stats.totalAciertos) || 0;
    var totalEstrellas = (stats && stats.totalEstrellas) || 0;

    return {
      partidasCompletadas: partidasCompletadas,
      porcentajeAciertos: partidasCompletadas === 0 ? 0 : (100 * totalAciertos) / (CLASIFICA_ROUNDS_PER_GAME * partidasCompletadas),
      estrellasPromedio: partidasCompletadas === 0 ? 0 : totalEstrellas / partidasCompletadas,
    };
  };

  /** `getClasificaLevelStats` for every level that has at least one recorded game, keyed by the same level id used to register it. */
  LogService.prototype.getClasificaAggregates = function () {
    var self = this;
    var result = {};
    Object.keys(this.clasificaLevelStats).forEach(function (levelKey) {
      result[levelKey] = self.getClasificaLevelStats(levelKey);
    });
    return result;
  };

  /**
   * Records a Clasifica controlled-guard diagnostic: `code` must be one of
   * `CLASIFICA_MISSING_CREATURE_RECORD`/`CLASIFICA_INVALID_DIET` (this
   * scope's only two codes -- no cronómetro/timing code exists). The entry
   * carries only `code`, `mode: 'clasifica'`, `level`, `creatureId` (if
   * available) and non-sensitive structured `context` -- never the player's
   * chosen category or any free text. Stored under its own key, local-only
   * and never included in `getLogsPayload()`/`sendLogs()`; never touches
   * `clasificaLevelStats` (a blocked round is not a completed game).
   */
  LogService.prototype.recordClasificaDiagnostic = function (params) {
    params = params || {};
    var code = params.code;

    if (CLASIFICA_DIAGNOSTIC_CODES.indexOf(code) === -1) {
      console.warn('DinoQuiz: recordClasificaDiagnostic requires one of the supported Clasifica diagnostic codes');
      return false;
    }

    var metadata = {
      mode: CLASIFICA_MODE_ID,
      level: params.level !== undefined ? params.level : null,
      creatureId: params.creatureId !== undefined ? params.creatureId : null,
      context: params.context !== undefined ? params.context : null,
    };

    var entry = createLogEntry(code, metadata);
    this.clasificaDiagnostics.push(entry);
    this._saveClasificaDiagnostics();
    return true;
  };

  LogService.prototype.getClasificaDiagnostics = function () {
    return this.clasificaDiagnostics.slice();
  };

  /**
   * Oído Jurásico diagnostics and aggregated metrics (TRIOFSND-271, PRD
   * "Diagnóstico y métricas agregadas almacenadas únicamente en el
   * dispositivo"). "Partidas iniciadas/completadas/abandonadas por nivel" and
   * "aciertos"/"estrellas" are already covered by the generic round-contract-
   * family counters above (`logRoundGameStarted`/`logRoundGameCompleted`/
   * `logRoundGameAbandoned`/`logRoundCorrectAnswer`/`logRoundStarsEarned`) --
   * Oído Jurásico is just another `modeId` (`OIDO_JURASICO_MODE_ID`, exported
   * below) through that same modeId+level family, same as Parejas above, so
   * this never re-declares a parallel set of Oído-Jurásico-only counters for
   * those. Two genuinely new, mode-specific stores are added here:
   *
   * `logOidoJurasicoPlaybackError(code)`/`getOidoJurasicoPlaybackErrors()`
   * record one entry per failed attempt to play the round's sound
   * (oidoJurasicoAudioService.js's `STATUS.ERROR`), each carrying only
   * `code` (one of the two exported `OIDO_JURASICO_AUDIO_UNAVAILABLE`/
   * `OIDO_JURASICO_PLAYBACK_FAILED` codes -- no other code is accepted),
   * `mode` (`OIDO_JURASICO_MODE_ID`) and a local calendar `date`
   * (`localDateString`, `YYYY-MM-DD` from the device's own clock, never a
   * full timestamp) -- deliberately never the round's creature id, its
   * sound file or any other player content. Stored under their own
   * `dinoquiz:oidoJurasicoPlaybackErrors` key, same array-with-MAX_LOGS-
   * rotation shape as `clasificaDiagnostics`, never pushed into the
   * transmittable `logs` array, so never reachable via
   * `getLogsPayload()`/`sendLogs()`.
   *
   * `logOidoJurasicoMissingCacheResource(resourceId)`/
   * `getOidoJurasicoMissingCacheResourceCounts()` tally, per stable resource
   * identifier (e.g. the precached sound's file path -- a technical asset
   * name, never round content), how many times the mode looked for that
   * resource in the Cache Storage populated by service-worker.js's
   * `PRECACHE_URLS` and didn't find it. Same aggregated, local-only,
   * never-transmitted-by-sendLogs counter shape as
   * `roundGenerationFailureCounts` above.
   *
   * Neither store is reset by `clearLogs()` -- same choice already made for
   * the generic round-contract counters and `modeBlockedLogs` above, which
   * `clearLogs()` deliberately leaves alone.
   */
  LogService.prototype._loadOidoJurasicoPlaybackErrors = function () {
    try {
      var stored = this.storageAdapter.getItem(OIDO_JURASICO_PLAYBACK_ERRORS_KEY);
      var parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('DinoQuiz: failed to load Oído Jurásico playback errors from storage', error);
      return [];
    }
  };

  LogService.prototype._saveOidoJurasicoPlaybackErrors = function () {
    try {
      if (this.oidoJurasicoPlaybackErrors.length > MAX_LOGS) {
        this.oidoJurasicoPlaybackErrors = this.oidoJurasicoPlaybackErrors.slice(-MAX_LOGS);
      }
      this.storageAdapter.setItem(OIDO_JURASICO_PLAYBACK_ERRORS_KEY, JSON.stringify(this.oidoJurasicoPlaybackErrors));
    } catch (error) {
      console.error('DinoQuiz: failed to save Oído Jurásico playback errors to storage', error);
    }
  };

  /** Records one failed Oído Jurásico playback attempt: `code` must be one of `OIDO_JURASICO_AUDIO_UNAVAILABLE`/`OIDO_JURASICO_PLAYBACK_FAILED`. Never any round content -- only `code`, `mode` and today's local date. */
  LogService.prototype.logOidoJurasicoPlaybackError = function (code) {
    if (OIDO_JURASICO_PLAYBACK_ERROR_CODES.indexOf(code) === -1) {
      console.warn('DinoQuiz: logOidoJurasicoPlaybackError requires one of the supported Oído Jurásico playback error codes');
      return false;
    }

    var entry = { code: code, mode: OIDO_JURASICO_MODE_ID, date: localDateString() };
    this.oidoJurasicoPlaybackErrors.push(entry);
    this._saveOidoJurasicoPlaybackErrors();
    return true;
  };

  LogService.prototype.getOidoJurasicoPlaybackErrors = function () {
    return this.oidoJurasicoPlaybackErrors.slice();
  };

  /** Tallies one more Oído Jurásico sound resource that was looked for in the Cache Storage precache and not found, identified only by a stable `resourceId` (e.g. its precached file path -- never round content). */
  LogService.prototype.logOidoJurasicoMissingCacheResource = function (resourceId) {
    if (typeof resourceId !== 'string' || resourceId.length === 0) {
      console.warn('DinoQuiz: logOidoJurasicoMissingCacheResource requires a valid resourceId');
      return 0;
    }
    return this._incrementLevelCount(OIDO_JURASICO_MISSING_CACHE_RESOURCE_COUNTS_KEY, this.oidoJurasicoMissingCacheResourceCounts, resourceId);
  };

  LogService.prototype.getOidoJurasicoMissingCacheResourceCounts = function () {
    return Object.assign({}, this.oidoJurasicoMissingCacheResourceCounts);
  };

  LogService.prototype.logAppAccess = function (metadata) {
    this.logEvent('app_access', metadata);
  };

  LogService.prototype.logServiceWorkerInstall = function (metadata) {
    this.logEvent('service_worker_install', metadata);
  };

  LogService.prototype.logServiceWorkerActivate = function (metadata) {
    this.logEvent('service_worker_activate', metadata);
  };

  LogService.prototype.logManifestLoad = function (metadata) {
    this.logEvent('manifest_load', metadata);
  };

  LogService.prototype.logPwaInstallAttempt = function (metadata) {
    this.logEvent('pwa_install_attempt', metadata);
  };

  LogService.prototype.logPwaInstallSuccess = function (metadata) {
    this.logEvent('pwa_install_success', metadata);
  };

  LogService.prototype.logPwaInstallFailure = function (metadata) {
    this.logEvent('pwa_install_failure', metadata);
  };

  LogService.prototype.getLogs = function () {
    return this.logs.slice();
  };

  LogService.prototype.getLogsByType = function (eventType) {
    return this.logs.filter(function (entry) {
      return entry.eventType === eventType;
    });
  };

  LogService.prototype.getLogsByTimeRange = function (startTime, endTime) {
    var start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    var end = typeof endTime === 'string' ? new Date(endTime) : endTime;

    return this.logs.filter(function (entry) {
      var ts = new Date(entry.timestamp);
      return ts >= start && ts <= end;
    });
  };

  /**
   * Clears the transmittable log array (as before) and also resets
   * Clasifica's aggregated stats/diagnostics (TRIOFSND-283) -- the
   * diagnostics service's one existing local reset operation, so a parent/
   * dev reset clears Clasifica's local-only data the same way it clears
   * everything else this method already owns. Unlike this reset, the
   * generic per-"modeId:level" counters above are deliberately left alone.
   */
  LogService.prototype.clearLogs = function () {
    this.logs = [];
    this._saveLogs();
    this.clasificaLevelStats = {};
    this._saveClasificaLevelStats();
    this.clasificaProcessedMatchIds = [];
    this._saveClasificaProcessedMatchIds();
    this.clasificaDiagnostics = [];
    this._saveClasificaDiagnostics();
  };

  LogService.prototype.getLogsPayload = function () {
    return {
      version: LOG_VERSION,
      timestamp: new Date().toISOString(),
      logCount: this.logs.length,
      logs: this.logs,
    };
  };

  LogService.prototype.sendLogs = function (endpointUrl, options) {
    var self = this;
    options = options || {};
    var clearOnSuccess = options.clearOnSuccess !== false; // default true
    var timeout = options.timeout || 5000;

    if (!endpointUrl || typeof endpointUrl !== 'string') {
      return Promise.reject(new Error('sendLogs requires a valid endpointUrl'));
    }

    if (typeof fetch === 'undefined') {
      return Promise.reject(new Error('fetch API not available'));
    }

    var payload = this.getLogsPayload();

    return fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        if (typeof response.json !== 'function') {
          return { success: true };
        }
        return response.json().catch(function () {
          return { success: true };
        });
      })
      .then(function (data) {
        if (clearOnSuccess) {
          self.clearLogs();
        }
        return data;
      })
      .catch(function (error) {
        console.error('DinoQuiz: failed to send logs to endpoint', endpointUrl, error);
        throw error;
      });
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      LogService: LogService,
      CATALOG_FIELD_INVALID_CAUSE: CATALOG_FIELD_INVALID_CAUSE,
      CATALOG_REFERENCE_BROKEN_CAUSE: CATALOG_REFERENCE_BROKEN_CAUSE,
      CATALOG_DUPLICATE_ID_CAUSE: CATALOG_DUPLICATE_ID_CAUSE,
      createLogEntry: createLogEntry,
      generateRequestId: generateRequestId,
      detectPlatform: detectPlatform,
      createLocalStorageAdapter: createLocalStorageAdapter,
      createMemoryAdapter: createMemoryAdapter,
      LOGS_STORAGE_KEY: LOGS_STORAGE_KEY,
      SELECTOR_OPEN_COUNT_KEY: SELECTOR_OPEN_COUNT_KEY,
      MODE_BLOCKED_LOGS_STORAGE_KEY: MODE_BLOCKED_LOGS_STORAGE_KEY,
      MAZE_GAMES_STARTED_KEY: MAZE_GAMES_STARTED_KEY,
      MAZE_GAMES_COMPLETED_KEY: MAZE_GAMES_COMPLETED_KEY,
      MAZE_GAMES_ABANDONED_KEY: MAZE_GAMES_ABANDONED_KEY,
      MAZE_RESOLVABILITY_FAILURE_COUNT_KEY: MAZE_RESOLVABILITY_FAILURE_COUNT_KEY,
      GAMES_ABANDONED_BY_MODE_KEY: GAMES_ABANDONED_BY_MODE_KEY,
      ROUND_GAMES_STARTED_KEY: ROUND_GAMES_STARTED_KEY,
      ROUND_GAMES_COMPLETED_KEY: ROUND_GAMES_COMPLETED_KEY,
      ROUND_GAMES_ABANDONED_KEY: ROUND_GAMES_ABANDONED_KEY,
      ROUND_GENERATION_FAILURE_CODES_KEY: ROUND_GENERATION_FAILURE_CODES_KEY,
      STATE_DISCARD_CODES_KEY: STATE_DISCARD_CODES_KEY,
      ROUND_CORRECT_ANSWERS_KEY: ROUND_CORRECT_ANSWERS_KEY,
      ROUND_STARS_EARNED_KEY: ROUND_STARS_EARNED_KEY,
      ROUND_GRID_LIMIT_VIOLATION_CODES_KEY: ROUND_GRID_LIMIT_VIOLATION_CODES_KEY,
      CLASIFICA_LEVEL_STATS_KEY: CLASIFICA_LEVEL_STATS_KEY,
      CLASIFICA_PROCESSED_MATCH_IDS_KEY: CLASIFICA_PROCESSED_MATCH_IDS_KEY,
      CLASIFICA_DIAGNOSTICS_KEY: CLASIFICA_DIAGNOSTICS_KEY,
      CLASIFICA_MODE_ID: CLASIFICA_MODE_ID,
      CLASIFICA_ROUNDS_PER_GAME: CLASIFICA_ROUNDS_PER_GAME,
      CLASIFICA_MISSING_CREATURE_RECORD: CLASIFICA_MISSING_CREATURE_RECORD,
      CLASIFICA_INVALID_DIET: CLASIFICA_INVALID_DIET,
      OIDO_JURASICO_PLAYBACK_ERRORS_KEY: OIDO_JURASICO_PLAYBACK_ERRORS_KEY,
      OIDO_JURASICO_MISSING_CACHE_RESOURCE_COUNTS_KEY: OIDO_JURASICO_MISSING_CACHE_RESOURCE_COUNTS_KEY,
      OIDO_JURASICO_MODE_ID: OIDO_JURASICO_MODE_ID,
      OIDO_JURASICO_AUDIO_UNAVAILABLE: OIDO_JURASICO_AUDIO_UNAVAILABLE,
      OIDO_JURASICO_PLAYBACK_FAILED: OIDO_JURASICO_PLAYBACK_FAILED,
      MAX_LOGS: MAX_LOGS,
      LOG_VERSION: LOG_VERSION,
    };
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.logging = {
      LogService: LogService,
      CATALOG_FIELD_INVALID_CAUSE: CATALOG_FIELD_INVALID_CAUSE,
      CATALOG_REFERENCE_BROKEN_CAUSE: CATALOG_REFERENCE_BROKEN_CAUSE,
      CATALOG_DUPLICATE_ID_CAUSE: CATALOG_DUPLICATE_ID_CAUSE,
      CLASIFICA_MODE_ID: CLASIFICA_MODE_ID,
      CLASIFICA_MISSING_CREATURE_RECORD: CLASIFICA_MISSING_CREATURE_RECORD,
      CLASIFICA_INVALID_DIET: CLASIFICA_INVALID_DIET,
      OIDO_JURASICO_MODE_ID: OIDO_JURASICO_MODE_ID,
      OIDO_JURASICO_AUDIO_UNAVAILABLE: OIDO_JURASICO_AUDIO_UNAVAILABLE,
      OIDO_JURASICO_PLAYBACK_FAILED: OIDO_JURASICO_PLAYBACK_FAILED,
      createLocalStorageAdapter: createLocalStorageAdapter,
      createMemoryAdapter: createMemoryAdapter,
    };
  }
})();
