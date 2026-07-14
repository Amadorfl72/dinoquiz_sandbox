import { beforeEach, describe, expect, it } from 'vitest';
import { readMetrics, recordScoreInMetrics } from '../metrics';
import { installMemoryStorage } from './testMemoryStorage';

beforeEach(() => {
  installMemoryStorage();
});

describe('metrics', () => {
  it('starts with an empty aggregate', () => {
    const metrics = readMetrics();
    expect(metrics.gamesCompleted).toBe(0);
    expect(metrics.totalScore).toBe(0);
    expect(metrics.averageScore).toBe(0);
    expect(metrics.lastUpdated).toBe(null);
  });

  it('accumulates the average score across completed games', () => {
    recordScoreInMetrics(6, '2026-07-15T10:00:00.000Z');
    const second = recordScoreInMetrics(8, '2026-07-15T10:05:00.000Z');

    expect(second.gamesCompleted).toBe(2);
    expect(second.totalScore).toBe(14);
    expect(second.averageScore).toBe(7);
    expect(second.lastUpdated).toBe('2026-07-15T10:05:00.000Z');
  });

  it('persists the aggregate across reads', () => {
    recordScoreInMetrics(10, '2026-07-15T10:00:00.000Z');
    const metrics = readMetrics();
    expect(metrics.gamesCompleted).toBe(1);
    expect(metrics.averageScore).toBe(10);
  });
});
