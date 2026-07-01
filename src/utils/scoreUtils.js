// Utility functions for score comparison and updates

export const compareScores = (currentScore, bestScore) => {
  return currentScore > bestScore;
};

export const updateBestScore = (currentScore, bestScore) => {
  return compareScores(currentScore, bestScore) ? currentScore : bestScore;
};
