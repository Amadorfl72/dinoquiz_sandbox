// Utility functions for score comparison and updates

export const compareScores = (currentScore, bestScore) => {
  if (currentScore === null || currentScore === undefined) return false;
  if (bestScore === null || bestScore === undefined) return true;
  return currentScore > bestScore;
};

export const updateBestScore = (currentScore, bestScore) => {
  if (currentScore === null || currentScore === undefined) return bestScore || 0;
  if (bestScore === null || bestScore === undefined) return currentScore;
  return Math.max(currentScore, bestScore);
};

export const getStars = (score) => {
  if (score === null || score === undefined || score < 0) return 1;
  if (score >= 7) return 3;
  if (score >= 4) return 2;
  return 1;
};