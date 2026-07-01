import { describe, it, expect, beforeEach, vi } from 'vitest';
import { evaluateAndUpdateBestScore } from '../bestScoreService';
import { eventBus } from '../eventBus';
import type { SafeStorage } from '../safeStorage';

function createMockStorage(initialBest: number = 0): SafeStorage & {
  _stored: number;
  _setCalls: number;
  _getCalls: number;
} {
 const store = {
    _stored: initialBest,
    _setCalls: 0,
    _getCalls: 0,
    getBestScore() {
      this._getCalls++;
      return this._stored;
    },
    setBestScore(score: number) {
      this._setCalls++;
      this._stored = score;
    },
  };
  return store;
}

describe('evaluateAndUpdateBestScore', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it('updates stored best and emits event when new score is higher', () => {
    const storage = createMockStorage(5);
    const handler = vi.fn();
    eventBus.on('best-score-updated', handler);

    const result = evaluateAndUpdateBestScore(8, storage);

    expect(result.isNewBest).toBe(true);
    expect(result.previousBest).toBe(5);
    expect(result.currentBest).toBe(8);
    expect(result.score).toBe(8);
    expect(storage._stored).toBe(8);
    expect(storage._setCalls).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ previousBest: 5, newBest: 8 });
  });

  it('does nothing when new score equals best', () => {
    const storage = createMockStorage(7);
    const handler = vi.fn();
    eventBus.on('best-score-updated', handler);

    const result = evaluateAndUpdateBestScore(7, storage);

    expect(result.isNewBest).toBe(false);
    expect(result.previousBest).toBe(7);
    expect(result.currentBest).toBe(7);
    expect(storage._stored).toBe(7);
    expect(storage._setCalls).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing when new score is lower than best', () => {
    const storage = createMockStorage(9);
    const handler = vi.fn();
    eventBus.on('best-score-updated', handler);

    const result = evaluateAndUpdateBestScore(3, storage);

    expect(result.isNewBest).toBe(false);
    expect(result.previousBest).toBe(9);
    expect(result.currentBest).toBe(9);
    expect(storage._stored).toBe(9);
    expect(storage._setCalls).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('updates from zero on first game with a positive score', () => {
    const storage = createMockStorage(0);
    const handler = vi.fn();
    eventBus.on('best-score-updated', handler);

    const result = evaluateAndUpdateBestScore(6, storage);

    expect(result.isNewBest).toBe(true);
    expect(result.previousBest).toBe(0);
    expect(result.currentBest).toBe(6);
    expect(storage._stored).toBe(6);
    expect(handler).toHaveBeenCalledWith({ previousBest: 0, newBest: 6 });
  });

  it('does not update when score is zero and best is zero', () => {
    const storage = createMockStorage(0);
    const handler = vi.fn();
    eventBus.on('best-score-updated', handler);

    const result = evaluateAndUpdateBestScore(0, storage);

    expect(result.isNewBest).toBe(false);
    expect(storage._setCalls).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('handles invalid (NaN) score gracefully as 0', () => {
    const storage = createMockStorage(3);
    const handler = vi.fn();
    eventBus.on('best-score-updated', handler);

    const result = evaluateAndUpdateBestScore(NaN, storage);

    expect(result.score).toBe(0);
    expect(result.isNewBest).toBe(false);
    expect(storage._setCalls).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('handles negative score gracefully as 0', () => {
    const storage = createMockStorage(2);
    const handler = vi.fn();
    eventBus.on('best-score-updated', handler);

    const result = evaluateAndUpdateBestScore(-5, storage);

    expect(result.score).toBe(0);
    expect(result.isNewBest).toBe(false);
    expect(storage._setCalls).toBe(0);
  });

  it('floors fractional scores before comparison', () => {
    const storage = createMockStorage(5);
    const handler = vi.fn();
    eventBus.on('best-score-updated', handler);

    const result = evaluateAndUpdateBestScore(5.9, storage);

    // 5.9 floored to 5, which is not > 5, so no update.
    expect(result.score).toBe(5);
    expect(result.isNewBest).toBe(false);
    expect(storage._setCalls).toBe(0);
  });

  it('emits correct previousBest when updating multiple times in sequence', () => {
    const storage = createMockStorage(0);
    const calls: { previousBest: number; newBest: number }[] = [];
    eventBus.on('best-score-updated', (p) => calls.push(p));

    evaluateAndUpdateBestScore(4, storage);
    evaluateAndUpdateBestScore(4, storage); // equal — no event
    evaluateAndUpdateBestScore(7, storage);
    evaluateAndUpdateBestScore(6, storage); // lower — no event
    evaluateAndUpdateBestScore(10, storage);

    expect(calls).toEqual([
      { previousBest: 0, newBest: 4 },
      { previousBest: 4, newBest: 7 },
      { previousBest: 7, newBest: 10 },
    ]);
    expect(storage._stored).toBe(10);
  });
});
