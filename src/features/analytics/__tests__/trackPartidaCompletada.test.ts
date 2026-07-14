import { beforeEach, describe, expect, it } from 'vitest';
import { recordPartidaCompletada } from '../trackPartidaCompletada';
import { readEvents } from '../eventLog';
import { readMetrics } from '../metrics';
import { installMemoryStorage } from './testMemoryStorage';

beforeEach(() => {
  installMemoryStorage();
});

describe('recordPartidaCompletada', () => {
  it('logs a partida_completada event without PII', () => {
    recordPartidaCompletada(9, 10, new Date('2026-07-15T12:00:00.000Z'));

    const events = readEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: 'partida_completada',
      timestamp: '2026-07-15T12:00:00.000Z',
      score: 9,
      totalQuestions: 10,
    });
  });

  it('updates the on-device average score metric', () => {
    recordPartidaCompletada(10, 10, new Date('2026-07-15T12:00:00.000Z'));
    recordPartidaCompletada(4, 10, new Date('2026-07-15T12:10:00.000Z'));

    const metrics = readMetrics();
    expect(metrics.gamesCompleted).toBe(2);
    expect(metrics.totalScore).toBe(14);
    expect(metrics.averageScore).toBe(7);
  });

  it('appends multiple events in order without overwriting history', () => {
    recordPartidaCompletada(5, 10, new Date('2026-07-15T12:00:00.000Z'));
    recordPartidaCompletada(7, 10, new Date('2026-07-15T12:05:00.000Z'));

    const events = readEvents();
    expect(events).toHaveLength(2);
    expect(events[0].score).toBe(5);
    expect(events[1].score).toBe(7);
  });
});
