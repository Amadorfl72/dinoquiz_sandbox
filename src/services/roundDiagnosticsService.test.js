'use strict';

const { attachToSession } = require('./roundDiagnosticsService');
const roundContract = require('../game/roundContract');
const { startGame, evaluateAnswer, advanceRound, ROUNDS_PER_GAME } = roundContract;

function buildGenerateRound(failOnRoundIndex) {
  return (roundIndex) => {
    if (typeof failOnRoundIndex === 'number' && roundIndex === failOnRoundIndex) {
      return { error: 'some_round_generation_failed' };
    }
    return { prompt: `round-${roundIndex}` };
  };
}

function startSession(failOnRoundIndex) {
  return startGame({ generateRound: buildGenerateRound(failOnRoundIndex) });
}

function playThroughToGameOver(session) {
  let current = session;
  for (let i = 0; i < ROUNDS_PER_GAME; i += 1) {
    current = evaluateAnswer(current, { isCorrect: true }).session;
    current = advanceRound(current).session;
  }
  return current;
}

function createFakeLogService() {
  return {
    started: [],
    completed: [],
    abandoned: [],
    failures: [],
    logRoundGameStarted(modeId, level) {
      this.started.push({ modeId, level });
    },
    logRoundGameCompleted(modeId, level) {
      this.completed.push({ modeId, level });
    },
    logRoundGameAbandoned(modeId, level) {
      this.abandoned.push({ modeId, level });
    },
    logRoundGenerationFailure(modeId, code) {
      this.failures.push({ modeId, code });
    },
  };
}

describe('roundDiagnosticsService.attachToSession', () => {
  it('requires an active roundContract session', () => {
    expect(() => attachToSession(null, { modeId: 'parejas', logService: createFakeLogService(), roundContract })).toThrow();
  });

  it('requires options.modeId', () => {
    const session = startSession();
    expect(() => attachToSession(session, { logService: createFakeLogService(), roundContract })).toThrow();
  });

  it('tallies "iniciada" immediately for modeId+level', () => {
    const session = startSession();
    const logService = createFakeLogService();

    attachToSession(session, { modeId: 'parejas', level: 2, logService, roundContract });

    expect(logService.started).toEqual([{ modeId: 'parejas', level: 2 }]);
    expect(logService.completed).toEqual([]);
    expect(logService.abandoned).toEqual([]);
  });

  it('defaults level to null when omitted', () => {
    const session = startSession();
    const logService = createFakeLogService();

    attachToSession(session, { modeId: 'clasifica', logService, roundContract });

    expect(logService.started).toEqual([{ modeId: 'clasifica', level: null }]);
  });

  it('tallies "completada" on game:over, never "abandonada"', () => {
    const session = startSession();
    const logService = createFakeLogService();
    const diagnostics = attachToSession(session, { modeId: 'parejas', level: 1, logService, roundContract });

    const finished = playThroughToGameOver(session);
    diagnostics.off();

    expect(finished.status).toBe('finished');
    expect(logService.completed).toEqual([{ modeId: 'parejas', level: 1 }]);
    expect(logService.abandoned).toEqual([]);
  });

  it('tallies "abandonada" when off() is called before game:over ever fired', () => {
    const session = startSession();
    const logService = createFakeLogService();
    const diagnostics = attachToSession(session, { modeId: 'parejas', level: 1, logService, roundContract });

    diagnostics.off();

    expect(logService.completed).toEqual([]);
    expect(logService.abandoned).toEqual([{ modeId: 'parejas', level: 1 }]);
  });

  it('off() is idempotent -- a second call never tallies "abandonada" twice', () => {
    const session = startSession();
    const logService = createFakeLogService();
    const diagnostics = attachToSession(session, { modeId: 'parejas', level: 1, logService, roundContract });

    diagnostics.off();
    diagnostics.off();

    expect(logService.abandoned).toEqual([{ modeId: 'parejas', level: 1 }]);
  });

  it('reports the initial round failure via round.error, without touching any other round content', () => {
    const session = startSession(0);
    const logService = createFakeLogService();

    attachToSession(session, { modeId: 'ordenaPorTamano', level: null, logService, roundContract });

    expect(logService.failures).toEqual([{ modeId: 'ordenaPorTamano', code: 'some_round_generation_failed' }]);
  });

  it('reports a later round failure via round:started', () => {
    const session = startSession(1);
    const logService = createFakeLogService();
    attachToSession(session, { modeId: 'ordenaPorTamano', level: null, logService, roundContract });

    const answered = evaluateAnswer(session, { isCorrect: true }).session;
    advanceRound(answered);

    expect(logService.failures).toEqual([{ modeId: 'ordenaPorTamano', code: 'some_round_generation_failed' }]);
  });

  it('never reports a failure for a round with no error', () => {
    const session = startSession();
    const logService = createFakeLogService();

    attachToSession(session, { modeId: 'ordenaPorTamano', level: null, logService, roundContract });

    expect(logService.failures).toEqual([]);
  });

  describe('diagnostics.js counters/errors (TRIOFSND-318)', () => {
    function createFakeDiagnostics() {
      const counters = [];
      const errors = [];
      return {
        counters,
        errors,
        incrementCounter(name) {
          counters.push(name);
        },
        recordError(mode, category, code) {
          errors.push({ mode, category, code });
        },
      };
    }

    it('tallies gameStarted:<modeId> immediately on attach', () => {
      const session = startSession();
      const diagnostics = createFakeDiagnostics();

      attachToSession(session, { modeId: 'parejas', level: 2, logService: createFakeLogService(), roundContract, diagnostics });

      expect(diagnostics.counters).toContain('gameStarted:parejas');
    });

    it('tallies gameCompleted:<modeId> on game:over, never gameAbandoned', () => {
      const session = startSession();
      const diagnostics = createFakeDiagnostics();
      const attached = attachToSession(session, { modeId: 'parejas', level: 1, logService: createFakeLogService(), roundContract, diagnostics });

      playThroughToGameOver(session);
      attached.off();

      expect(diagnostics.counters).toContain('gameCompleted:parejas');
      expect(diagnostics.counters).not.toContain('gameAbandoned:parejas');
    });

    it('tallies gameAbandoned:<modeId> when off() is called before game:over ever fired', () => {
      const session = startSession();
      const diagnostics = createFakeDiagnostics();
      const attached = attachToSession(session, { modeId: 'parejas', level: 1, logService: createFakeLogService(), roundContract, diagnostics });

      attached.off();

      expect(diagnostics.counters).not.toContain('gameCompleted:parejas');
      expect(diagnostics.counters).toContain('gameAbandoned:parejas');
    });

    it('records a structured roundGeneration diagnostics error for a round.error, the same stable code logService received', () => {
      const session = startSession(0);
      const diagnostics = createFakeDiagnostics();

      attachToSession(session, { modeId: 'ordenaPorTamano', level: null, logService: createFakeLogService(), roundContract, diagnostics });

      expect(diagnostics.errors).toEqual([
        { mode: 'ordenaPorTamano', category: 'roundGeneration', code: 'some_round_generation_failed' },
      ]);
    });
  });
});
