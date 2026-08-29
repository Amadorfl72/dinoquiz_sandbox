'use strict';

const logging = require('./index');
const LogService = logging.LogService || logging;
const scoring = require('../../../public/scripts/scoring');

function makeStorage() {
  const store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
}

describe('LogService — structured access & PWA install logging', () => {
  let service;
  let storage;

  beforeEach(() => {
    storage = makeStorage();
    service = new LogService(storage);
  });

  describe('entry shape', () => {
    it('stores an app_access entry with every required structured field', () => {
      service.logAppAccess({ screen: 'home' });
      const logs = service.getLogs();
      expect(logs).toHaveLength(1);
      const entry = logs[0];
      expect(entry.version).toBe('1.0');
      expect(entry.eventType).toBe('app_access');
      expect(typeof entry.timestamp).toBe('string');
      expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
      expect(typeof entry.requestId).toBe('string');
      expect(entry.requestId).toMatch(/^log_/);
      expect(typeof entry.userAgent).toBe('string');
      expect(typeof entry.platform).toBe('string');
      expect(entry.metadata).toEqual({ screen: 'home' });
    });

    it('records the three PWA install lifecycle phases under distinct eventTypes', () => {
      service.logPwaInstallAttempt({ trigger: 'beforeinstallprompt' });
      service.logPwaInstallSuccess({});
      service.logPwaInstallFailure({ reason: 'dismissed' });
      expect(service.getLogs().map((e) => e.eventType)).toEqual([
        'pwa_install_attempt',
        'pwa_install_success',
        'pwa_install_failure',
      ]);
    });

    it('ignores an invalid eventType without throwing or persisting anything', () => {
      expect(() => service.logEvent('', {})).not.toThrow();
      expect(() => service.logEvent(null, {})).not.toThrow();
      expect(() => service.logEvent(42, {})).not.toThrow();
      expect(service.getLogs()).toHaveLength(0);
    });

    it('defaults metadata to an empty object when omitted', () => {
      service.logAppAccess();
      expect(service.getLogs()[0].metadata).toEqual({});
    });
  });

  describe('querying', () => {
    it('getLogs returns a defensive copy', () => {
      service.logAppAccess({});
      const snapshot = service.getLogs();
      snapshot.push('tampered');
      expect(service.getLogs()).toHaveLength(1);
    });

    it('getLogsByType filters by eventType', () => {
      service.logAppAccess({});
      service.logPwaInstallAttempt({});
      service.logAppAccess({});
      expect(service.getLogsByType('app_access')).toHaveLength(2);
      expect(service.getLogsByType('pwa_install_attempt')).toHaveLength(1);
      expect(service.getLogsByType('nope')).toHaveLength(0);
    });

    it('getLogsByTimeRange accepts string dates and is inclusive on both ends', () => {
      service.logAppAccess({});
      const all = service.getLogsByTimeRange(
        new Date(0).toISOString(),
        new Date(Date.now() + 60000).toISOString(),
      );
      expect(all).toHaveLength(1);
      const future = service.getLogsByTimeRange(
        new Date(Date.now() + 60000),
        new Date(Date.now() + 120000),
      );
      expect(future).toHaveLength(0);
    });
  });

  describe('persistence & limits', () => {
    it('round-trips logs through storage into a fresh instance', () => {
      service.logAppAccess({ n: 1 });
      service.logPwaInstallAttempt({ n: 2 });
      const reloaded = new LogService(storage);
      expect(reloaded.getLogs()).toHaveLength(2);
      expect(reloaded.getLogs()[0].metadata).toEqual({ n: 1 });
      expect(reloaded.getLogs()[1].metadata).toEqual({ n: 2 });
    });

    it('truncates to the last MAX_LOGS (1000) entries, dropping the oldest', () => {
      for (let i = 0; i < 1001; i += 1) {
        service.logEvent('app_access', { i });
      }
      const logs = service.getLogs();
      expect(logs).toHaveLength(1000);
      expect(logs[0].metadata).toEqual({ i: 1 });
      expect(logs[logs.length - 1].metadata).toEqual({ i: 1000 });
    });

    it('clearLogs wipes both memory and persisted state', () => {
      service.logAppAccess({});
      service.clearLogs();
      expect(service.getLogs()).toHaveLength(0);
      expect(storage.getItem('dinoquiz:logs')).toBe('[]');
    });
  });

  describe('selector-open counter (TRIOFSND-230)', () => {
    it('starts at zero and increments on each logSelectorOpen call', () => {
      expect(service.getSelectorOpenCount()).toBe(0);
      expect(service.logSelectorOpen()).toBe(1);
      expect(service.logSelectorOpen()).toBe(2);
      expect(service.getSelectorOpenCount()).toBe(2);
    });

    it('persists the count under its own key, separate from the logs array', () => {
      service.logSelectorOpen();
      service.logSelectorOpen();
      expect(storage.getItem('dinoquiz:selectorOpenCount')).toBe('2');
      expect(service.getLogs()).toHaveLength(0);
    });

    it('round-trips the count through storage into a fresh instance', () => {
      service.logSelectorOpen();
      service.logSelectorOpen();
      service.logSelectorOpen();
      const reloaded = new LogService(storage);
      expect(reloaded.getSelectorOpenCount()).toBe(3);
    });

    it('is unaffected by clearLogs', () => {
      service.logSelectorOpen();
      service.logAppAccess({});
      service.clearLogs();
      expect(service.getSelectorOpenCount()).toBe(1);
    });
  });

  describe('mode-blocked log entry (TRIOFSND-230)', () => {
    it('records a mode_blocked entry with modeId and cause in metadata', () => {
      service.logModeBlocked('sombra', 'insufficient_creatures');
      const logs = service.getModeBlockedLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].eventType).toBe('mode_blocked');
      expect(logs[0].metadata).toEqual({ modeId: 'sombra', cause: 'insufficient_creatures' });
    });

    it('defaults cause to null when omitted', () => {
      service.logModeBlocked('parejas');
      expect(service.getModeBlockedLogs()[0].metadata).toEqual({
        modeId: 'parejas',
        cause: null,
      });
    });

    it('ignores an invalid modeId without throwing or persisting anything', () => {
      expect(() => service.logModeBlocked('', 'x')).not.toThrow();
      expect(() => service.logModeBlocked(null, 'x')).not.toThrow();
      expect(() => service.logModeBlocked(42, 'x')).not.toThrow();
      expect(service.getModeBlockedLogs()).toHaveLength(0);
    });

    it('is stored separately from the regular log array, never via getLogsByType', () => {
      service.logModeBlocked('sombra', 'insufficient_creatures');
      expect(service.getLogs()).toHaveLength(0);
      expect(service.getLogsByType('mode_blocked')).toHaveLength(0);
    });

    it('persists under its own key, separate from dinoquiz:logs', () => {
      service.logModeBlocked('sombra', 'insufficient_creatures');
      expect(storage.getItem('dinoquiz:modeBlockedLogs')).not.toBeNull();
      expect(storage.getItem('dinoquiz:logs')).toBeNull();
    });

    it('round-trips through storage into a fresh instance', () => {
      service.logModeBlocked('sombra', 'insufficient_creatures');
      const reloaded = new LogService(storage);
      expect(reloaded.getModeBlockedLogs()).toHaveLength(1);
      expect(reloaded.getModeBlockedLogs()[0].metadata).toEqual({
        modeId: 'sombra',
        cause: 'insufficient_creatures',
      });
    });

    it('is unaffected by clearLogs', () => {
      service.logModeBlocked('sombra', 'insufficient_creatures');
      service.clearLogs();
      expect(service.getModeBlockedLogs()).toHaveLength(1);
    });

    it('is never included in getLogsPayload or transmitted by sendLogs (local-only, privacy)', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      try {
        service.logModeBlocked('sombra', 'insufficient_creatures');

        const payload = service.getLogsPayload();
        expect(payload.logs.some((entry) => entry.eventType === 'mode_blocked')).toBe(false);

        await service.sendLogs('https://log.example/ingest', { timeout: 50 });
        const [, config] = global.fetch.mock.calls[0];
        const body = JSON.parse(config.body);
        expect(body.logs.some((entry) => entry.eventType === 'mode_blocked')).toBe(false);

        // still locally retrievable after transmission
        expect(service.getModeBlockedLogs()).toHaveLength(1);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Laberinto diagnostics counters (TRIOFSND-259)', () => {
    it('tallies games started per level independently', () => {
      expect(service.logMazeGameStarted(1)).toBe(1);
      expect(service.logMazeGameStarted(1)).toBe(2);
      expect(service.logMazeGameStarted(2)).toBe(1);
      expect(service.getMazeGamesStartedByLevel()).toEqual({ 1: 2, 2: 1 });
    });

    it('tallies games completed per level independently of games started', () => {
      service.logMazeGameStarted(1);
      service.logMazeGameStarted(1);
      service.logMazeGameCompleted(1);
      expect(service.getMazeGamesStartedByLevel()).toEqual({ 1: 2 });
      expect(service.getMazeGamesCompletedByLevel()).toEqual({ 1: 1 });
    });

    it('tallies games abandoned per level independently', () => {
      service.logMazeGameStarted(3);
      service.logMazeGameAbandoned(3);
      expect(service.getMazeGamesAbandonedByLevel()).toEqual({ 3: 1 });
      expect(service.getMazeGamesCompletedByLevel()).toEqual({});
    });

    it('persists each per-level counter under its own dinoquiz: key', () => {
      service.logMazeGameStarted(1);
      service.logMazeGameCompleted(1);
      service.logMazeGameAbandoned(2);
      expect(storage.getItem('dinoquiz:mazeGamesStartedByLevel')).toBe('{"1":1}');
      expect(storage.getItem('dinoquiz:mazeGamesCompletedByLevel')).toBe('{"1":1}');
      expect(storage.getItem('dinoquiz:mazeGamesAbandonedByLevel')).toBe('{"2":1}');
    });

    it('round-trips all three per-level counters through storage into a fresh instance', () => {
      service.logMazeGameStarted(1);
      service.logMazeGameCompleted(1);
      service.logMazeGameAbandoned(2);
      const reloaded = new LogService(storage);
      expect(reloaded.getMazeGamesStartedByLevel()).toEqual({ 1: 1 });
      expect(reloaded.getMazeGamesCompletedByLevel()).toEqual({ 1: 1 });
      expect(reloaded.getMazeGamesAbandonedByLevel()).toEqual({ 2: 1 });
    });

    it('are unaffected by clearLogs', () => {
      service.logMazeGameStarted(1);
      service.clearLogs();
      expect(service.getMazeGamesStartedByLevel()).toEqual({ 1: 1 });
    });

    it('tallies resolvability failures as a single aggregated counter', () => {
      expect(service.getMazeResolvabilityFailureCount()).toBe(0);
      expect(service.logMazeResolvabilityFailure()).toBe(1);
      expect(service.logMazeResolvabilityFailure()).toBe(2);
      expect(service.getMazeResolvabilityFailureCount()).toBe(2);
      expect(storage.getItem('dinoquiz:mazeResolvabilityFailureCount')).toBe('2');
    });

    it('are never included in getLogsPayload or transmitted by sendLogs (local-only, privacy)', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      try {
        service.logMazeGameStarted(1);
        service.logMazeGameCompleted(1);
        service.logMazeGameAbandoned(1);
        service.logMazeResolvabilityFailure();

        const payload = service.getLogsPayload();
        expect(payload.logs).toHaveLength(0);

        await service.sendLogs('https://log.example/ingest', { timeout: 50 });
        const [, config] = global.fetch.mock.calls[0];
        const body = JSON.parse(config.body);
        expect(body.logs).toHaveLength(0);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('round-contract diagnostics counters (TRIOFSND-246)', () => {
    it('tallies games started per mode+level independently', () => {
      expect(service.logRoundGameStarted('ordenaPorTamano', 1)).toBe(1);
      expect(service.logRoundGameStarted('ordenaPorTamano', 1)).toBe(2);
      expect(service.logRoundGameStarted('ordenaPorTamano', 2)).toBe(1);
      expect(service.logRoundGameStarted('lineaDelTiempo', 1)).toBe(1);
      expect(service.getRoundGamesStartedByModeLevel()).toEqual({
        'ordenaPorTamano:1': 2,
        'ordenaPorTamano:2': 1,
        'lineaDelTiempo:1': 1,
      });
    });

    it('tallies games completed and abandoned per mode+level independently of games started', () => {
      service.logRoundGameStarted('parejas', 1);
      service.logRoundGameStarted('parejas', 1);
      service.logRoundGameCompleted('parejas', 1);
      service.logRoundGameAbandoned('parejas', 1);
      expect(service.getRoundGamesStartedByModeLevel()).toEqual({ 'parejas:1': 2 });
      expect(service.getRoundGamesCompletedByModeLevel()).toEqual({ 'parejas:1': 1 });
      expect(service.getRoundGamesAbandonedByModeLevel()).toEqual({ 'parejas:1': 1 });
    });

    it('accepts a null level for modes without a difficulty level', () => {
      expect(service.logRoundGameStarted('clasifica', null)).toBe(1);
      expect(service.getRoundGamesStartedByModeLevel()).toEqual({ 'clasifica:null': 1 });
    });

    it('persists each per-"modeId:level" counter under its own dinoquiz: key', () => {
      service.logRoundGameStarted('parejas', 1);
      service.logRoundGameCompleted('parejas', 1);
      service.logRoundGameAbandoned('sombra', 2);
      expect(storage.getItem('dinoquiz:roundGamesStartedByModeLevel')).toBe('{"parejas:1":1}');
      expect(storage.getItem('dinoquiz:roundGamesCompletedByModeLevel')).toBe('{"parejas:1":1}');
      expect(storage.getItem('dinoquiz:roundGamesAbandonedByModeLevel')).toBe('{"sombra:2":1}');
    });

    it('round-trips all three per-"modeId:level" counters through storage into a fresh instance', () => {
      service.logRoundGameStarted('parejas', 1);
      service.logRoundGameCompleted('parejas', 1);
      service.logRoundGameAbandoned('sombra', 2);
      const reloaded = new LogService(storage);
      expect(reloaded.getRoundGamesStartedByModeLevel()).toEqual({ 'parejas:1': 1 });
      expect(reloaded.getRoundGamesCompletedByModeLevel()).toEqual({ 'parejas:1': 1 });
      expect(reloaded.getRoundGamesAbandonedByModeLevel()).toEqual({ 'sombra:2': 1 });
    });

    it('tallies round-generation failures per "modeId:code"', () => {
      expect(service.logRoundGenerationFailure('ordenaPorTamano', 'size_order_round_generation_failed')).toBe(1);
      expect(service.logRoundGenerationFailure('ordenaPorTamano', 'size_order_round_generation_failed')).toBe(2);
      expect(service.logRoundGenerationFailure('laberinto', 'maze_round_generation_failed')).toBe(1);
      expect(service.getRoundGenerationFailureCounts()).toEqual({
        'ordenaPorTamano:size_order_round_generation_failed': 2,
        'laberinto:maze_round_generation_failed': 1,
      });
    });

    it('ignores a round-generation-failure call without a valid code', () => {
      expect(service.logRoundGenerationFailure('quiz', '')).toBe(0);
      expect(service.logRoundGenerationFailure('quiz', undefined)).toBe(0);
      expect(service.getRoundGenerationFailureCounts()).toEqual({});
    });

    it('tallies state-discard codes per "modeId:code"', () => {
      expect(service.logStateDiscarded('quiz', 'storage_session_discard_incompatible')).toBe(1);
      expect(service.logStateDiscarded('quiz', 'storage_session_discard_incompatible')).toBe(2);
      expect(service.getStateDiscardCounts()).toEqual({
        'quiz:storage_session_discard_incompatible': 2,
      });
    });

    it('ignores a state-discard call without a valid code', () => {
      expect(service.logStateDiscarded('quiz', '')).toBe(0);
      expect(service.getStateDiscardCounts()).toEqual({});
    });

    it('are unaffected by clearLogs', () => {
      service.logRoundGameStarted('parejas', 1);
      service.logRoundGenerationFailure('parejas', 'some_failure_code');
      service.logStateDiscarded('parejas', 'storage_session_discard_incompatible');
      service.clearLogs();
      expect(service.getRoundGamesStartedByModeLevel()).toEqual({ 'parejas:1': 1 });
      expect(service.getRoundGenerationFailureCounts()).toEqual({ 'parejas:some_failure_code': 1 });
      expect(service.getStateDiscardCounts()).toEqual({ 'parejas:storage_session_discard_incompatible': 1 });
    });

    it('are never included in getLogsPayload or transmitted by sendLogs (local-only, privacy)', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      try {
        service.logRoundGameStarted('parejas', 1);
        service.logRoundGameCompleted('parejas', 1);
        service.logRoundGameAbandoned('parejas', 1);
        service.logRoundGenerationFailure('parejas', 'some_failure_code');
        service.logStateDiscarded('parejas', 'storage_session_discard_incompatible');

        const payload = service.getLogsPayload();
        expect(payload.logs).toHaveLength(0);

        await service.sendLogs('https://log.example/ingest', { timeout: 50 });
        const [, config] = global.fetch.mock.calls[0];
        const body = JSON.parse(config.body);
        expect(body.logs).toHaveLength(0);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Parejas jurásicas diagnostics counters (TRIOFSND-277)', () => {
    it('tallies correct answers ("aciertos") per "modeId:level"', () => {
      expect(service.logRoundCorrectAnswer('parejas', 1)).toBe(1);
      expect(service.logRoundCorrectAnswer('parejas', 1)).toBe(2);
      expect(service.logRoundCorrectAnswer('parejas', 2)).toBe(1);
      expect(service.logRoundCorrectAnswer('laberinto', 1)).toBe(1);
      expect(service.getRoundCorrectAnswersByModeLevel()).toEqual({
        'parejas:1': 2,
        'parejas:2': 1,
        'laberinto:1': 1,
      });
    });

    it('accumulates stars earned per "modeId:level" instead of always +1', () => {
      expect(service.logRoundStarsEarned('parejas', 1, 3)).toBe(3);
      expect(service.logRoundStarsEarned('parejas', 1, 2)).toBe(5);
      expect(service.logRoundStarsEarned('parejas', 2, 1)).toBe(1);
      expect(service.getRoundStarsEarnedByModeLevel()).toEqual({
        'parejas:1': 5,
        'parejas:2': 1,
      });
    });

    it('ignores a stars-earned call without a non-negative integer stars count', () => {
      expect(service.logRoundStarsEarned('parejas', 1, -1)).toBe(0);
      expect(service.logRoundStarsEarned('parejas', 1, 1.5)).toBe(0);
      expect(service.logRoundStarsEarned('parejas', 1, undefined)).toBe(0);
      expect(service.getRoundStarsEarnedByModeLevel()).toEqual({});
    });

    it('tallies grid-limit-violation codes per "modeId:code"', () => {
      expect(service.logRoundGridLimitViolation('parejas', 'max_visible_unmatched_exceeded')).toBe(1);
      expect(service.logRoundGridLimitViolation('parejas', 'max_visible_unmatched_exceeded')).toBe(2);
      expect(service.getRoundGridLimitViolationCounts()).toEqual({
        'parejas:max_visible_unmatched_exceeded': 2,
      });
    });

    it('ignores a grid-limit-violation call without a valid code', () => {
      expect(service.logRoundGridLimitViolation('parejas', '')).toBe(0);
      expect(service.logRoundGridLimitViolation('parejas', undefined)).toBe(0);
      expect(service.getRoundGridLimitViolationCounts()).toEqual({});
    });

    it('board-generation-failure codes reuse the existing generic round-generation-failure counter (no duplicate concept)', () => {
      expect(service.logRoundGenerationFailure('parejas', 'parejas_board_generation_failed')).toBe(1);
      expect(service.getRoundGenerationFailureCounts()).toEqual({
        'parejas:parejas_board_generation_failed': 1,
      });
    });

    it('persists each new counter under its own dinoquiz: key and round-trips through storage into a fresh instance', () => {
      service.logRoundCorrectAnswer('parejas', 1);
      service.logRoundStarsEarned('parejas', 1, 3);
      service.logRoundGridLimitViolation('parejas', 'max_visible_unmatched_exceeded');
      expect(storage.getItem('dinoquiz:roundCorrectAnswersByModeLevel')).toBe('{"parejas:1":1}');
      expect(storage.getItem('dinoquiz:roundStarsEarnedByModeLevel')).toBe('{"parejas:1":3}');
      expect(storage.getItem('dinoquiz:roundGridLimitViolationCodes')).toBe('{"parejas:max_visible_unmatched_exceeded":1}');

      const reloaded = new LogService(storage);
      expect(reloaded.getRoundCorrectAnswersByModeLevel()).toEqual({ 'parejas:1': 1 });
      expect(reloaded.getRoundStarsEarnedByModeLevel()).toEqual({ 'parejas:1': 3 });
      expect(reloaded.getRoundGridLimitViolationCounts()).toEqual({ 'parejas:max_visible_unmatched_exceeded': 1 });
    });

    it('are unaffected by clearLogs', () => {
      service.logRoundCorrectAnswer('parejas', 1);
      service.logRoundStarsEarned('parejas', 1, 3);
      service.logRoundGridLimitViolation('parejas', 'max_visible_unmatched_exceeded');
      service.clearLogs();
      expect(service.getRoundCorrectAnswersByModeLevel()).toEqual({ 'parejas:1': 1 });
      expect(service.getRoundStarsEarnedByModeLevel()).toEqual({ 'parejas:1': 3 });
      expect(service.getRoundGridLimitViolationCounts()).toEqual({ 'parejas:max_visible_unmatched_exceeded': 1 });
    });

    it('are never included in getLogsPayload or transmitted by sendLogs (local-only, privacy)', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      try {
        service.logRoundCorrectAnswer('parejas', 1);
        service.logRoundStarsEarned('parejas', 1, 3);
        service.logRoundGridLimitViolation('parejas', 'max_visible_unmatched_exceeded');

        const payload = service.getLogsPayload();
        expect(payload.logs).toHaveLength(0);

        await service.sendLogs('https://log.example/ingest', { timeout: 50 });
        const [, config] = global.fetch.mock.calls[0];
        const body = JSON.parse(config.body);
        expect(body.logs).toHaveLength(0);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Clasifica aggregated metrics & diagnostics (TRIOFSND-283)', () => {
    it('a first valid game increments partidasCompletadas and folds in its aciertos/estrellas', () => {
      expect(service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 7, stars: 2 })).toBe(true);
      expect(service.getClasificaLevelStats(1)).toEqual({
        partidasCompletadas: 1,
        porcentajeAciertos: 70,
        estrellasPromedio: 2,
      });
    });

    it('accumulates several completed games into the same level', () => {
      service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 10, stars: 3 });
      service.recordClasificaGame({ matchId: 'm2', level: 1, correct: 5, stars: 2 });
      expect(service.getClasificaLevelStats(1)).toEqual({
        partidasCompletadas: 2,
        porcentajeAciertos: 75, // 100 * (10 + 5) / (10 * 2)
        estrellasPromedio: 2.5,
      });
    });

    it('derives porcentajeAciertos from the summed integer totals, never averaging previously-rounded percentages', () => {
      // 1/10 (10%) and 2/10 (20%) rounded individually would average to 15%,
      // but the true combined percentage over 20 rounds is 3/20 = 15% here
      // -- pick counts where naive per-game rounding would drift instead.
      service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 1, stars: 1 });
      service.recordClasificaGame({ matchId: 'm2', level: 1, correct: 2, stars: 1 });
      service.recordClasificaGame({ matchId: 'm3', level: 1, correct: 1, stars: 1 });
      // totals: 4 aciertos over 3 games * 10 rounds = 30 -> 13.333...%
      expect(service.getClasificaLevelStats(1).porcentajeAciertos).toBeCloseTo(400 / 30, 10);
    });

    it('keeps levels fully independent -- registering level 2 never touches level 1', () => {
      service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 10, stars: 3 });
      service.recordClasificaGame({ matchId: 'm2', level: 2, correct: 0, stars: 1 });
      expect(service.getClasificaLevelStats(1)).toEqual({ partidasCompletadas: 1, porcentajeAciertos: 100, estrellasPromedio: 3 });
      expect(service.getClasificaLevelStats(2)).toEqual({ partidasCompletadas: 1, porcentajeAciertos: 0, estrellasPromedio: 1 });
    });

    it('getClasificaAggregates returns every registered level keyed by its own id', () => {
      service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 10, stars: 3 });
      service.recordClasificaGame({ matchId: 'm2', level: 3, correct: 0, stars: 1 });
      expect(service.getClasificaAggregates()).toEqual({
        1: { partidasCompletadas: 1, porcentajeAciertos: 100, estrellasPromedio: 3 },
        3: { partidasCompletadas: 1, porcentajeAciertos: 0, estrellasPromedio: 1 },
      });
    });

    it('registering the same matchId twice (or more) is idempotent -- identical state as registering once', () => {
      service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 6, stars: 2 });
      expect(service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 6, stars: 2 })).toBe(true);
      expect(service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 6, stars: 2 })).toBe(true);
      expect(service.getClasificaLevelStats(1)).toEqual({
        partidasCompletadas: 1,
        porcentajeAciertos: 60,
        estrellasPromedio: 2,
      });
    });

    it('rejects correct outside 0..10 without mutating any aggregate', () => {
      expect(service.recordClasificaGame({ matchId: 'm1', level: 1, correct: -1, stars: 2 })).toBe(false);
      expect(service.recordClasificaGame({ matchId: 'm2', level: 1, correct: 11, stars: 2 })).toBe(false);
      expect(service.recordClasificaGame({ matchId: 'm3', level: 1, correct: 5.5, stars: 2 })).toBe(false);
      expect(service.getClasificaAggregates()).toEqual({});
    });

    it('accepts the boundary values 0 and 10 for correct', () => {
      expect(service.recordClasificaGame({ matchId: 'm0', level: 1, correct: 0, stars: 1 })).toBe(true);
      expect(service.recordClasificaGame({ matchId: 'm10', level: 2, correct: 10, stars: 3 })).toBe(true);
      expect(service.getClasificaLevelStats(1).porcentajeAciertos).toBe(0);
      expect(service.getClasificaLevelStats(2).porcentajeAciertos).toBe(100);
    });

    it('validates stars against scoring.js own PERCENTAGE_STAR_TIERS values, rejecting anything outside it', () => {
      const validStars = scoring.PERCENTAGE_STAR_TIERS.map((tier) => tier.stars);
      validStars.forEach((stars, index) => {
        expect(service.recordClasificaGame({ matchId: `valid-${index}`, level: 1, correct: 5, stars })).toBe(true);
      });
      expect(service.recordClasificaGame({ matchId: 'bad-1', level: 1, correct: 5, stars: 0 })).toBe(false);
      expect(service.recordClasificaGame({ matchId: 'bad-2', level: 1, correct: 5, stars: 4 })).toBe(false);
      expect(service.recordClasificaGame({ matchId: 'bad-3', level: 1, correct: 5, stars: 1.5 })).toBe(false);
      expect(service.recordClasificaGame({ matchId: 'bad-4', level: 1, correct: 5, stars: undefined })).toBe(false);
      expect(service.getClasificaLevelStats(1).partidasCompletadas).toBe(validStars.length);
    });

    it('rejects a missing matchId or level without mutating any aggregate', () => {
      expect(service.recordClasificaGame({ level: 1, correct: 5, stars: 2 })).toBe(false);
      expect(service.recordClasificaGame({ matchId: '', level: 1, correct: 5, stars: 2 })).toBe(false);
      expect(service.recordClasificaGame({ matchId: 'm1', correct: 5, stars: 2 })).toBe(false);
      expect(service.recordClasificaGame({ matchId: 'm1', level: null, correct: 5, stars: 2 })).toBe(false);
      expect(service.getClasificaAggregates()).toEqual({});
    });

    it('a game is never counted before it is registered -- no automatic tally mid-game', () => {
      expect(service.getClasificaLevelStats(1)).toEqual({ partidasCompletadas: 0, porcentajeAciertos: 0, estrellasPromedio: 0 });
    });

    it('with zero completed games, returns 0 for every metric -- never NaN, Infinity or a throw', () => {
      expect(() => service.getClasificaLevelStats(99)).not.toThrow();
      const stats = service.getClasificaLevelStats(99);
      expect(stats.partidasCompletadas).toBe(0);
      expect(stats.porcentajeAciertos).toBe(0);
      expect(stats.estrellasPromedio).toBe(0);
      expect(Number.isNaN(stats.porcentajeAciertos)).toBe(false);
      expect(Number.isFinite(stats.porcentajeAciertos)).toBe(true);
      expect(Number.isFinite(stats.estrellasPromedio)).toBe(true);
    });

    it('records CLASIFICA_MISSING_CREATURE_RECORD exclusively in the local diagnostics store', () => {
      expect(service.recordClasificaDiagnostic({
        code: logging.CLASIFICA_MISSING_CREATURE_RECORD,
        level: 2,
        creatureId: 'trex',
      })).toBe(true);

      const entries = service.getClasificaDiagnostics();
      expect(entries).toHaveLength(1);
      expect(entries[0].eventType).toBe(logging.CLASIFICA_MISSING_CREATURE_RECORD);
      expect(entries[0].metadata).toEqual({ mode: 'clasifica', level: 2, creatureId: 'trex', context: null });
      expect(service.getLogs()).toHaveLength(0);
      expect(service.getLogsByType(logging.CLASIFICA_MISSING_CREATURE_RECORD)).toHaveLength(0);
    });

    it('records CLASIFICA_INVALID_DIET exclusively in the local diagnostics store', () => {
      expect(service.recordClasificaDiagnostic({
        code: logging.CLASIFICA_INVALID_DIET,
        level: 3,
        creatureId: 'stegosaurus',
        context: { rule: 'diet' },
      })).toBe(true);

      const entries = service.getClasificaDiagnostics();
      expect(entries[0].eventType).toBe(logging.CLASIFICA_INVALID_DIET);
      expect(entries[0].metadata).toEqual({ mode: 'clasifica', level: 3, creatureId: 'stegosaurus', context: { rule: 'diet' } });
    });

    it('rejects any diagnostic code outside the two defined for this scope (no cronómetro/timing codes)', () => {
      expect(service.recordClasificaDiagnostic({ code: 'CLASIFICA_TIMEOUT', level: 1 })).toBe(false);
      expect(service.recordClasificaDiagnostic({ code: 'classify_missing_creature_sheet', level: 1 })).toBe(false);
      expect(service.getClasificaDiagnostics()).toHaveLength(0);
    });

    it('recording a diagnostic never counts the round as completed and never touches level metrics', () => {
      service.recordClasificaDiagnostic({ code: logging.CLASIFICA_MISSING_CREATURE_RECORD, level: 1, creatureId: 'trex' });
      expect(service.getClasificaLevelStats(1)).toEqual({ partidasCompletadas: 0, porcentajeAciertos: 0, estrellasPromedio: 0 });
    });

    it('is never included in getLogsPayload or transmitted by sendLogs (local-only, privacy)', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      try {
        service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 5, stars: 2 });
        service.recordClasificaDiagnostic({ code: logging.CLASIFICA_MISSING_CREATURE_RECORD, level: 1, creatureId: 'trex' });

        const payload = service.getLogsPayload();
        expect(payload.logs).toHaveLength(0);

        await service.sendLogs('https://log.example/ingest', { timeout: 50 });
        const [, config] = global.fetch.mock.calls[0];
        const body = JSON.parse(config.body);
        expect(body.logs).toHaveLength(0);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('persists both aggregates and diagnostics under their own dinoquiz: keys and round-trips into a fresh instance after reload', () => {
      service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 8, stars: 3 });
      service.recordClasificaDiagnostic({ code: logging.CLASIFICA_INVALID_DIET, level: 1, creatureId: 'trex' });

      expect(storage.getItem('dinoquiz:clasificaLevelStats')).not.toBeNull();
      expect(storage.getItem('dinoquiz:clasificaProcessedMatchIds')).toBe('["m1"]');
      expect(storage.getItem('dinoquiz:clasificaDiagnostics')).not.toBeNull();

      const reloaded = new LogService(storage);
      expect(reloaded.getClasificaLevelStats(1)).toEqual({ partidasCompletadas: 1, porcentajeAciertos: 80, estrellasPromedio: 3 });
      expect(reloaded.getClasificaDiagnostics()).toHaveLength(1);

      // idempotency survives the reload too -- the same matchId is still known
      expect(reloaded.recordClasificaGame({ matchId: 'm1', level: 1, correct: 8, stars: 3 })).toBe(true);
      expect(reloaded.getClasificaLevelStats(1).partidasCompletadas).toBe(1);
    });

    it('tolerates a corrupted or incompatible stored entry without throwing, without erasing other modes data', () => {
      storage.setItem('dinoquiz:clasificaLevelStats', 'not valid json{{{');
      storage.setItem('dinoquiz:clasificaProcessedMatchIds', '"not an array"');
      storage.setItem('dinoquiz:clasificaDiagnostics', 'also not json[[[');
      service.logMazeGameStarted(1); // another mode's counter, written before the corrupted reload

      expect(() => new LogService(storage)).not.toThrow();
      const reloaded = new LogService(storage);
      expect(reloaded.getClasificaAggregates()).toEqual({});
      expect(reloaded.getClasificaDiagnostics()).toEqual([]);
      expect(reloaded.getMazeGamesStartedByLevel()).toEqual({ 1: 1 });

      expect(reloaded.recordClasificaGame({ matchId: 'm1', level: 1, correct: 5, stars: 2 })).toBe(true);
      expect(reloaded.getClasificaLevelStats(1).partidasCompletadas).toBe(1);
    });

    it('recording Clasifica never modifies another mode counter', () => {
      service.logMazeGameStarted(1);
      service.logRoundGameCompleted('parejas', 1);
      service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 5, stars: 2 });
      expect(service.getMazeGamesStartedByLevel()).toEqual({ 1: 1 });
      expect(service.getRoundGamesCompletedByModeLevel()).toEqual({ 'parejas:1': 1 });
    });

    it('never persists the player chosen category, per-round correctness, an answer sequence or free text', () => {
      service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 7, stars: 2 });
      service.recordClasificaDiagnostic({ code: logging.CLASIFICA_MISSING_CREATURE_RECORD, level: 1, creatureId: 'trex' });

      const persisted = [
        storage.getItem('dinoquiz:clasificaLevelStats'),
        storage.getItem('dinoquiz:clasificaProcessedMatchIds'),
        storage.getItem('dinoquiz:clasificaDiagnostics'),
      ].join(' ');

      ['carnivoro', 'herbivoro', 'omnivoro', 'category', 'answers', 'isCorrect'].forEach((forbidden) => {
        expect(persisted).not.toMatch(forbidden);
      });
    });

    it('clearLogs resets Clasifica aggregates, processed match ids and diagnostics', () => {
      service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 7, stars: 2 });
      service.recordClasificaDiagnostic({ code: logging.CLASIFICA_MISSING_CREATURE_RECORD, level: 1, creatureId: 'trex' });

      service.clearLogs();

      expect(service.getClasificaAggregates()).toEqual({});
      expect(service.getClasificaDiagnostics()).toEqual([]);
      // a matchId recorded before the reset is treated as new again after it
      expect(service.recordClasificaGame({ matchId: 'm1', level: 1, correct: 7, stars: 2 })).toBe(true);
      expect(service.getClasificaLevelStats(1).partidasCompletadas).toBe(1);
    });
  });

  describe('Oído Jurásico diagnostics & aggregated metrics (TRIOFSND-271)', () => {
    it('partidas iniciadas/completadas/abandonadas por nivel reuse the generic round-contract counters under OIDO_JURASICO_MODE_ID', () => {
      expect(logging.OIDO_JURASICO_MODE_ID).toBe('oidoJurasico');
      service.logRoundGameStarted(logging.OIDO_JURASICO_MODE_ID, 1);
      service.logRoundGameStarted(logging.OIDO_JURASICO_MODE_ID, 1);
      service.logRoundGameCompleted(logging.OIDO_JURASICO_MODE_ID, 1);
      service.logRoundGameAbandoned(logging.OIDO_JURASICO_MODE_ID, 1);
      service.logRoundCorrectAnswer(logging.OIDO_JURASICO_MODE_ID, 1);
      service.logRoundStarsEarned(logging.OIDO_JURASICO_MODE_ID, 1, 3);
      expect(service.getRoundGamesStartedByModeLevel()).toEqual({ 'oidoJurasico:1': 2 });
      expect(service.getRoundGamesCompletedByModeLevel()).toEqual({ 'oidoJurasico:1': 1 });
      expect(service.getRoundGamesAbandonedByModeLevel()).toEqual({ 'oidoJurasico:1': 1 });
      expect(service.getRoundCorrectAnswersByModeLevel()).toEqual({ 'oidoJurasico:1': 1 });
      expect(service.getRoundStarsEarnedByModeLevel()).toEqual({ 'oidoJurasico:1': 3 });
    });

    it('records a playback error with code, mode and a local YYYY-MM-DD date, nothing else', () => {
      expect(service.logOidoJurasicoPlaybackError(logging.OIDO_JURASICO_AUDIO_UNAVAILABLE)).toBe(true);
      const entries = service.getOidoJurasicoPlaybackErrors();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        code: logging.OIDO_JURASICO_AUDIO_UNAVAILABLE,
        mode: 'oidoJurasico',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
    });

    it('accepts both supported playback error codes and rejects anything else', () => {
      expect(service.logOidoJurasicoPlaybackError(logging.OIDO_JURASICO_PLAYBACK_FAILED)).toBe(true);
      expect(service.logOidoJurasicoPlaybackError('OIDO_JURASICO_TIMEOUT')).toBe(false);
      expect(service.logOidoJurasicoPlaybackError('')).toBe(false);
      expect(service.logOidoJurasicoPlaybackError(undefined)).toBe(false);
      expect(service.getOidoJurasicoPlaybackErrors()).toHaveLength(1);
    });

    it('keeps playback errors out of the transmittable logs array', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      try {
        service.logOidoJurasicoPlaybackError(logging.OIDO_JURASICO_AUDIO_UNAVAILABLE);
        expect(service.getLogsPayload().logs).toHaveLength(0);
        await service.sendLogs('https://log.example/ingest', { timeout: 50 });
        const [, config] = global.fetch.mock.calls[0];
        expect(JSON.parse(config.body).logs).toHaveLength(0);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('persists playback errors under their own dinoquiz: key and round-trips through storage', () => {
      service.logOidoJurasicoPlaybackError(logging.OIDO_JURASICO_PLAYBACK_FAILED);
      expect(storage.getItem('dinoquiz:oidoJurasicoPlaybackErrors')).toContain('OIDO_JURASICO_PLAYBACK_FAILED');
      const reloaded = new LogService(storage);
      expect(reloaded.getOidoJurasicoPlaybackErrors()).toHaveLength(1);
    });

    it('tallies missing cache resources per resourceId', () => {
      expect(service.logOidoJurasicoMissingCacheResource('/assets/sounds/oido-jurasico/trex.wav')).toBe(1);
      expect(service.logOidoJurasicoMissingCacheResource('/assets/sounds/oido-jurasico/trex.wav')).toBe(2);
      expect(service.logOidoJurasicoMissingCacheResource('/assets/sounds/oido-jurasico/triceratops.wav')).toBe(1);
      expect(service.getOidoJurasicoMissingCacheResourceCounts()).toEqual({
        '/assets/sounds/oido-jurasico/trex.wav': 2,
        '/assets/sounds/oido-jurasico/triceratops.wav': 1,
      });
    });

    it('ignores a missing-cache-resource call without a valid resourceId', () => {
      expect(service.logOidoJurasicoMissingCacheResource('')).toBe(0);
      expect(service.logOidoJurasicoMissingCacheResource(undefined)).toBe(0);
      expect(service.getOidoJurasicoMissingCacheResourceCounts()).toEqual({});
    });

    it('persists missing-cache-resource counts under their own dinoquiz: key and round-trips through storage', () => {
      service.logOidoJurasicoMissingCacheResource('/assets/sounds/oido-jurasico/trex.wav');
      expect(storage.getItem('dinoquiz:oidoJurasicoMissingCacheResourceCounts')).toBe(
        '{"/assets/sounds/oido-jurasico/trex.wav":1}',
      );
      const reloaded = new LogService(storage);
      expect(reloaded.getOidoJurasicoMissingCacheResourceCounts()).toEqual({
        '/assets/sounds/oido-jurasico/trex.wav': 1,
      });
    });

    it('are unaffected by clearLogs', () => {
      service.logOidoJurasicoPlaybackError(logging.OIDO_JURASICO_AUDIO_UNAVAILABLE);
      service.logOidoJurasicoMissingCacheResource('/assets/sounds/oido-jurasico/trex.wav');
      service.clearLogs();
      expect(service.getOidoJurasicoPlaybackErrors()).toHaveLength(1);
      expect(service.getOidoJurasicoMissingCacheResourceCounts()).toEqual({
        '/assets/sounds/oido-jurasico/trex.wav': 1,
      });
    });

    it('tolerates a corrupted or incompatible stored entry without throwing', () => {
      storage.setItem('dinoquiz:oidoJurasicoPlaybackErrors', 'not valid json{{{');
      storage.setItem('dinoquiz:oidoJurasicoMissingCacheResourceCounts', '"not an object"');

      expect(() => new LogService(storage)).not.toThrow();
      const reloaded = new LogService(storage);
      expect(reloaded.getOidoJurasicoPlaybackErrors()).toEqual([]);
      expect(reloaded.getOidoJurasicoMissingCacheResourceCounts()).toEqual({});
    });
  });

  describe('logModeResourceMissing / getModeResourceMissingCounts (TRIOFSND-306)', () => {
    it('tallies missing resources per "modeId:resourceUrl"', () => {
      expect(service.logModeResourceMissing('laberinto', '/scripts/mazeGame.js')).toBe(1);
      expect(service.logModeResourceMissing('laberinto', '/scripts/mazeGame.js')).toBe(2);
      expect(service.logModeResourceMissing('quiz', '/scripts/mazeGame.js')).toBe(1);
      expect(service.getModeResourceMissingCounts()).toEqual({
        'laberinto:/scripts/mazeGame.js': 2,
        'quiz:/scripts/mazeGame.js': 1,
      });
    });

    it('ignores a call without a valid modeId or resourceUrl', () => {
      expect(service.logModeResourceMissing('', '/scripts/mazeGame.js')).toBe(0);
      expect(service.logModeResourceMissing('laberinto', '')).toBe(0);
      expect(service.logModeResourceMissing(undefined, undefined)).toBe(0);
      expect(service.getModeResourceMissingCounts()).toEqual({});
    });

    it('persists counts under their own dinoquiz: key and round-trips through storage', () => {
      service.logModeResourceMissing('laberinto', '/scripts/mazeGame.js');
      expect(storage.getItem('dinoquiz:modeResourceMissingCounts')).toBe('{"laberinto:/scripts/mazeGame.js":1}');
      const reloaded = new LogService(storage);
      expect(reloaded.getModeResourceMissingCounts()).toEqual({ 'laberinto:/scripts/mazeGame.js': 1 });
    });

    it('is unaffected by clearLogs', () => {
      service.logModeResourceMissing('laberinto', '/scripts/mazeGame.js');
      service.clearLogs();
      expect(service.getModeResourceMissingCounts()).toEqual({ 'laberinto:/scripts/mazeGame.js': 1 });
    });

    it('is never included in the transmittable logs payload', () => {
      service.logModeResourceMissing('laberinto', '/scripts/mazeGame.js');
      const payload = service.getLogsPayload();
      expect(JSON.stringify(payload)).not.toContain('modeResourceMissing');
    });

    it('tolerates a corrupted or incompatible stored entry without throwing', () => {
      storage.setItem('dinoquiz:modeResourceMissingCounts', '"not an object"');
      expect(() => new LogService(storage)).not.toThrow();
      expect(new LogService(storage).getModeResourceMissingCounts()).toEqual({});
    });
  });

  describe('getLogsPayload', () => {
    it('builds a transmission payload with version, count and the logs', () => {
      service.logAppAccess({});
      service.logPwaInstallAttempt({});
      const payload = service.getLogsPayload();
      expect(payload.version).toBe('1.0');
      expect(payload.logCount).toBe(2);
      expect(Array.isArray(payload.logs)).toBe(true);
      expect(payload.logs).toHaveLength(2);
      expect(typeof payload.timestamp).toBe('string');
    });
  });

  describe('sendLogs endpoint', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('POSTs the JSON payload and clears logs on a 2xx response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      service.logAppAccess({ a: 1 });
      service.logPwaInstallAttempt({ b: 2 });

      await service.sendLogs('https://log.example/ingest', { timeout: 50 });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, config] = global.fetch.mock.calls[0];
      expect(url).toBe('https://log.example/ingest');
      expect(config.method).toBe('POST');
      expect(config.headers['Content-Type']).toBe('application/json');
      const body = JSON.parse(config.body);
      expect(body.version).toBe('1.0');
      expect(body.logCount).toBe(2);
      expect(body.logs).toHaveLength(2);
      expect(service.getLogs()).toHaveLength(0);
    });

    it('keeps logs when clearOnSuccess is false', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      service.logAppAccess({});
      await service.sendLogs('https://log.example/ingest', { clearOnSuccess: false, timeout: 50 });
      expect(service.getLogs()).toHaveLength(1);
    });

    it('keeps logs on an HTTP error response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
      service.logAppAccess({});
      try {
        await service.sendLogs('https://log.example/ingest', { timeout: 50 });
      } catch (e) {
        // rejection is allowed; the invariant is that logs survive
      }
      expect(service.getLogs()).toHaveLength(1);
    });

    it('keeps logs on a network failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
      service.logAppAccess({});
      try {
        await service.sendLogs('https://log.example/ingest', { timeout: 50 });
      } catch (e) {
        // expected
      }
      expect(service.getLogs()).toHaveLength(1);
    });
  });
});
