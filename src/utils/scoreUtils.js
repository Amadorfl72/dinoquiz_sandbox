// Utility functions for score comparison and updates

export const compareScores = (currentScore, bestScore) => {
  return currentScore > bestScore;
};

export const updateBestScore = (currentScore, bestScore) => {
  return Math.max(currentScore, bestScore);
};

export const getStars = (score) => {
  if (score >= 7) return 3;
  if (score >= 4) return 2;
  return 1;
};
