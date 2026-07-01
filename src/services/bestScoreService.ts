import { safeStorage, SafeStorage } from './safeStorage';
import { eventBus } from './eventBus';

/**
 * Result of evaluating a completed game's score against the stored best.
 */
export interface BestScoreEvaluation {
  /** The score the player just achieved. */
  score: number;
  /** The best score that was stored *before* this evaluation. */
  previousBest: number;
  /** The best score *after* this evaluation (updated if score > previousBest). */
  currentBest: number;
  /** True when the score exceeded the previous best and storage was updated. */
  isNewBest: boolean;
}

/**
 * Compares the new score with the stored best score.
 *
 * - If `newScore > best`, updates the stored value and emits the
 *   `best-score-updated` event so the UI can show celebratory feedback.
 * - If `newScore <= best`, does nothing (no write, no event).
 *
 * @param newScore The score achieved in the just-completed game.
 * @returns A BestScoreEvaluation describing the outcome.
 */
export function evaluateAndUpdateBestScore(
  newScore: number,
  storage: SafeStorage = safeStorage,
): BestScoreEvaluation {
  // Guard against invalid input — treat as 0 rather than crashing the flow.
  const safeScore = Number.isFinite(newScore) && newScore >= 0 ? Math.floor(newScore) : 0;

  const previousBest = storage.getBestScore();

  if (safeScore > previousBest) {
    storage.setBestScore(safeScore);

    eventBus.emit('best-score-updated', {
      previousBest,
      newBest: safeScore,
    });

    return {
      score: safeScore,
      previousBest,
      currentBest: safeScore,
      isNewBest: true,
    };
  }

  return {
    score: safeScore,
    previousBest,
    currentBest: previousBest,
    isNewBest: false,
  };
}

export default evaluateAndUpdateBestScore;
