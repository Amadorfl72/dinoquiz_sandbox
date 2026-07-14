import { appendEvent } from './eventLog';
import { recordScoreInMetrics, type AggregateMetrics } from './metrics';

export interface RecordPartidaCompletadaResult {
  metrics: AggregateMetrics;
}

/**
 * Called once when the Resultados screen mounts. Logs the
 * partida_completada event (score + question count only, no PII) and
 * folds the score into the on-device average-score aggregate.
 */
export function recordPartidaCompletada(
  score: number,
  totalQuestions: number,
  now: Date = new Date()
): RecordPartidaCompletadaResult {
  const timestamp = now.toISOString();

  appendEvent({
    type: 'partida_completada',
    timestamp,
    score,
    totalQuestions,
  });

  const metrics = recordScoreInMetrics(score, timestamp);

  return { metrics };
}
