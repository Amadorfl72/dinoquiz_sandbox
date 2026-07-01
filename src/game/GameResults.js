import { logBestScoreUpdated } from '../utils/logging';
import { saveBestScore, loadBestScore } from '../services/storage';

export function handleGameResults(currentScore) {
  const previousBest = loadBestScore();
  
  if (currentScore > previousBest) {
    saveBestScore(currentScore);
    logBestScoreUpdated(currentScore, previousBest);
  }
  
  // Rest of the results handling logic
}
