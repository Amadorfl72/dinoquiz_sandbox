import { logBestScoreUpdated } from '../utils/logging';
import { saveBestScore, loadBestScore } from '../services/storage';

export function handleGameResults(currentScore) {
  const previousBest = loadBestScore();
  
  if (currentScore > previousBest) {
    const saveResult = saveBestScore(currentScore);
    // Only log if save was successful
    if (saveResult) {
      logBestScoreUpdated(currentScore, previousBest);
    }
  }
  
  // Rest of the results handling logic
}