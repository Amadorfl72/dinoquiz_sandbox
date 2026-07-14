import { readItem, writeItem } from './storage';

export const METRICS_STORAGE_KEY = 'dinoquiz.metrics.v1';

export interface AggregateMetrics {
  gamesCompleted: number;
  totalScore: number;
  averageScore: number;
  lastUpdated: string | null;
}

const EMPTY_METRICS: AggregateMetrics = {
  gamesCompleted: 0,
  totalScore: 0,
  averageScore: 0,
  lastUpdated: null,
};

export function readMetrics(): AggregateMetrics {
  const raw = readItem(METRICS_STORAGE_KEY);
  if (!raw) return { ...EMPTY_METRICS };
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.gamesCompleted === 'number' &&
      typeof parsed?.totalScore === 'number' &&
      typeof parsed?.averageScore === 'number'
    ) {
      return parsed as AggregateMetrics;
    }
    return { ...EMPTY_METRICS };
  } catch {
    return { ...EMPTY_METRICS };
  }
}

/**
 * Folds one game's score into the on-device aggregate. `gamesCompleted`
 * doubles as the numerator source for a future completion-rate metric
 * once a matching "gamesStarted" counter is introduced.
 */
export function recordScoreInMetrics(score: number, timestamp: string): AggregateMetrics {
  const current = readMetrics();
  const gamesCompleted = current.gamesCompleted + 1;
  const totalScore = current.totalScore + score;
  const updated: AggregateMetrics = {
    gamesCompleted,
    totalScore,
    averageScore: totalScore / gamesCompleted,
    lastUpdated: timestamp,
  };
  writeItem(METRICS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
