'use strict';

const {
  TimelineProgressService,
  MODE_ID,
  PROGRESS_SCHEMA_VERSION,
  PROGRESS_KEY,
  PROGRESS_DISCARD_INCOMPATIBLE_CODE,
} = require('./timelineProgressService');
const gameFlow = require('../game/gameFlow');

function createFakeLogService() {
  return {
    stateDiscardedCalls: [],
    eventCalls: [],
    roundGameStartedCalls: [],
    roundGameCompletedCalls: [],
    roundGameAbandonedCalls: [],
    roundCorrectAnswerCalls: [],
    roundStarsEarnedCalls: [],
    logStateDiscarded(modeId, code) {
      this.stateDiscardedCalls.push({ modeId, code });
    },
    logEvent(eventType) {
      this.eventCalls.push(eventType);
    },
    logRoundGameStarted(modeId, level) {
      this.roundGameStartedCalls.push({ modeId, level });
    },
    logRoundGameCompleted(modeId, level) {
      this.roundGameCompletedCalls.push({ modeId, level });
    },
    logRoundGameAbandoned(modeId, level) {
      this.roundGameAbandonedCalls.push({ modeId, level });
    },
    logRoundCorrectAnswer(modeId, level) {
      this.roundCorrectAnswerCalls.push({ modeId, level });
    },
    logRoundStarsEarned(modeId, level, stars) {
      this.roundStarsEarnedCalls.push({ modeId, level, stars });
    },
  };
}

function createFakeAdapter(overrides = {}) {
  const store = new Map();
  return {
    name: 'memory',
    async isAvailable() {
      return true;
    },
    async getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
    ...overrides,
  };
}

function answersOf(count, isCorrect = true) {
  return Array.from({ length: count }, (_, i) => ({ roundIndex: i, isCorrect }));
}

describe('TimelineProgressService', () => {
  describe('defaults', () => {
    test('starts at level 1 unlocked, no unlocks and no last result', async () => {
      const service = new TimelineProgressService([createFakeAdapter()], createFakeLogService());

      expect(await service.getProgress()).toEqual({
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        maxUnlockedLevel: 1,
        unlockCount: 0,
        lastResult: null,
      });
      expect(await service.getMaxUnlockedLevel()).toBe(1);
      expect(await service.getUnlockCount()).toBe(0);
      expect(await service.getLastResult()).toBeNull();
    });
  });

  describe('getUnlockThreshold', () => {
    test('reads this mode own unlockThresholds.js entry, never another mode', () => {
      const service = new TimelineProgressService([createFakeAdapter()], createFakeLogService());

      expect(service.getUnlockThreshold(1)).toBe(gameFlow.getUnlockThreshold(MODE_ID, 1));
    });
  });

  describe('recordGameStarted / recordGameAbandoned', () => {
    test('tally the existing generic per-mode diagnostics counters', () => {
      const logService = createFakeLogService();
      const service = new TimelineProgressService([createFakeAdapter()], logService);

      service.recordGameStarted(1);
      service.recordGameAbandoned(1);

      expect(logService.roundGameStartedCalls).toEqual([{ modeId: MODE_ID, level: 1 }]);
      expect(logService.roundGameAbandonedCalls).toEqual([{ modeId: MODE_ID, level: 1 }]);
    });
  });

  describe('recordGameFinished', () => {
    test('persists score/maxScore alongside the derived percentage and star tier', async () => {
      const service = new TimelineProgressService([createFakeAdapter()], createFakeLogService());
      const threshold = gameFlow.getUnlockThreshold(MODE_ID, 1);

      const result = await service.recordGameFinished({
        level: 1,
        answers: answersOf(threshold),
        score: threshold,
        maxScore: 10,
      });

      expect(result.percentage).toBe(threshold * 10);
      expect(await service.getLastResult()).toEqual({
        score: threshold,
        maxScore: 10,
        percentage: threshold * 10,
        stars: result.stars,
        level: 1,
      });
    });

    test('unlocks the next level and advances maxUnlockedLevel when aciertos clear the threshold', async () => {
      const service = new TimelineProgressService([createFakeAdapter()], createFakeLogService());
      const threshold = gameFlow.getUnlockThreshold(MODE_ID, 1);

      const result = await service.recordGameFinished({
        level: 1,
        answers: answersOf(threshold),
        score: threshold,
        maxScore: 10,
      });

      expect(result.unlocked).toBe(true);
      expect(result.nextLevel).toBe(2);
      expect(await service.getMaxUnlockedLevel()).toBe(2);
      expect(await service.getUnlockCount()).toBe(1);
    });

    test('does not unlock when aciertos fall short of the threshold', async () => {
      const service = new TimelineProgressService([createFakeAdapter()], createFakeLogService());
      const threshold = gameFlow.getUnlockThreshold(MODE_ID, 1);

      const result = await service.recordGameFinished({
        level: 1,
        answers: answersOf(threshold - 1),
        score: threshold - 1,
        maxScore: 10,
      });

      expect(result.unlocked).toBe(false);
      expect(result.nextLevel).toBeNull();
      expect(await service.getMaxUnlockedLevel()).toBe(1);
      expect(await service.getUnlockCount()).toBe(0);
    });

    test('does not double-count unlockCount when a cleared level is replayed', async () => {
      const service = new TimelineProgressService([createFakeAdapter()], createFakeLogService());
      const threshold = gameFlow.getUnlockThreshold(MODE_ID, 1);

      await service.recordGameFinished({ level: 1, answers: answersOf(threshold), score: threshold, maxScore: 10 });
      await service.recordGameFinished({ level: 1, answers: answersOf(threshold), score: threshold, maxScore: 10 });

      expect(await service.getMaxUnlockedLevel()).toBe(2);
      expect(await service.getUnlockCount()).toBe(1);
    });

    test('never unlocks past MAX_LEVEL', async () => {
      const service = new TimelineProgressService([createFakeAdapter()], createFakeLogService());

      const result = await service.recordGameFinished({
        level: gameFlow.MAX_LEVEL,
        answers: answersOf(10),
        score: 10,
        maxScore: 10,
      });

      expect(result.unlocked).toBe(false);
      expect(await service.getMaxUnlockedLevel()).toBe(1);
    });

    test('tallies one completed game, one acierto per correct answer and the stars earned', async () => {
      const logService = createFakeLogService();
      const service = new TimelineProgressService([createFakeAdapter()], logService);

      const result = await service.recordGameFinished({ level: 1, answers: answersOf(7), score: 7, maxScore: 10 });

      expect(logService.roundGameCompletedCalls).toEqual([{ modeId: MODE_ID, level: 1 }]);
      expect(logService.roundCorrectAnswerCalls).toHaveLength(7);
      logService.roundCorrectAnswerCalls.forEach((call) => expect(call).toEqual({ modeId: MODE_ID, level: 1 }));
      expect(logService.roundStarsEarnedCalls).toEqual([{ modeId: MODE_ID, level: 1, stars: result.stars }]);
    });

    test('persists and restores a zero-score result instead of discarding it as incompatible', async () => {
      const adapter = createFakeAdapter();
      const service = new TimelineProgressService([adapter], createFakeLogService());

      const result = await service.recordGameFinished({
        level: 1,
        answers: answersOf(10, false),
        score: 0,
        maxScore: 10,
      });

      expect(result.percentage).toBe(0);
      expect(await service.getLastResult()).toEqual({
        score: 0,
        maxScore: 10,
        percentage: 0,
        stars: result.stars,
        level: 1,
      });

      // A fresh service instance reading the same adapter simulates a restore
      // on a later visit: the zero-score result must come back unchanged,
      // never discarded as an incompatible/invalid stored entry.
      const restored = new TimelineProgressService([adapter], createFakeLogService());
      expect(await restored.getLastResult()).toEqual({
        score: 0,
        maxScore: 10,
        percentage: 0,
        stars: result.stars,
        level: 1,
      });
    });

    test('restores a stored result with stars: 0 rather than discarding it as incompatible', async () => {
      const logService = createFakeLogService();
      const adapter = createFakeAdapter();
      await adapter.setItem(
        PROGRESS_KEY,
        JSON.stringify({
          schemaVersion: PROGRESS_SCHEMA_VERSION,
          maxUnlockedLevel: 1,
          unlockCount: 0,
          lastResult: { score: 0, maxScore: 10, percentage: 0, stars: 0, level: 1 },
        })
      );
      const service = new TimelineProgressService([adapter], logService);

      expect(await service.getLastResult()).toEqual({ score: 0, maxScore: 10, percentage: 0, stars: 0, level: 1 });
      expect(logService.stateDiscardedCalls).toEqual([]);
    });

    test('never mutates a sibling mode own progress stored on the same adapter', async () => {
      const adapter = createFakeAdapter();
      await adapter.setItem('dinoquiz:modeProgress:quiz', JSON.stringify({ untouched: true }));
      const service = new TimelineProgressService([adapter], createFakeLogService());
      const threshold = gameFlow.getUnlockThreshold(MODE_ID, 1);

      await service.recordGameFinished({ level: 1, answers: answersOf(threshold), score: threshold, maxScore: 10 });

      expect(await adapter.getItem('dinoquiz:modeProgress:quiz')).toBe(JSON.stringify({ untouched: true }));
    });
  });

  describe('storage isolation', () => {
    test('persists under its own dinoquiz:timeline: key, distinct from the shared modeProgress namespace', async () => {
      const adapter = createFakeAdapter();
      const service = new TimelineProgressService([adapter], createFakeLogService());

      await service.recordGameFinished({ level: 1, answers: answersOf(6), score: 6, maxScore: 10 });

      expect(PROGRESS_KEY).toBe('dinoquiz:timeline:progress');
      expect(await adapter.getItem(PROGRESS_KEY)).not.toBeNull();
      expect(await adapter.getItem('dinoquiz:modeProgress:lineaDelTiempo')).toBeNull();
    });
  });

  describe('corrupted/incompatible stored progress', () => {
    test('discards and defaults, logging the stable discard code', async () => {
      const logService = createFakeLogService();
      const adapter = createFakeAdapter();
      await adapter.setItem(PROGRESS_KEY, JSON.stringify({ schemaVersion: 999 }));
      const service = new TimelineProgressService([adapter], logService);

      const progress = await service.getProgress();

      expect(progress).toEqual({
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        maxUnlockedLevel: 1,
        unlockCount: 0,
        lastResult: null,
      });
      expect(logService.stateDiscardedCalls).toEqual([{ modeId: MODE_ID, code: PROGRESS_DISCARD_INCOMPATIBLE_CODE }]);
    });
  });

  describe('getDiagnostics', () => {
    test('reports the active backend', async () => {
      const service = new TimelineProgressService([createFakeAdapter()], createFakeLogService());
      await service.getProgress();

      expect(service.getDiagnostics()).toMatchObject({ backend: 'memory', isPersistent: false, failureCount: 0 });
    });
  });
});
