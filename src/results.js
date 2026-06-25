import { getBestScore, saveBestScore } from './storage.js';

/**
 * Handles the game completion logic.
 * Compares the current score with the best score saved in localStorage.
 * If the current score is greater, it updates localStorage and flags to show the new best score message.
 * 
 * @param {number} currentScore - The score achieved in the current game.
 * @returns {Object} An object containing the score details and whether to show the new best score message.
 */
export function handleGameCompletion(currentScore) {
  const bestScore = getBestScore();
  let isNewBestScore = false;

  if (currentScore > bestScore) {
    saveBestScore(currentScore);
    isNewBestScore = true;
  }

  return {
    score: currentScore,
    bestScore: isNewBestScore ? currentScore : bestScore,
    showNewBestScoreMessage: isNewBestScore
  };
}
