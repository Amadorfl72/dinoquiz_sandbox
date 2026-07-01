export const saveBestScore = (score) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const currentBest = getBestScore();
      if (score > currentBest) {
        localStorage.setItem('bestScore', score.toString());
        return true; // Indicates new best score was saved
      }
    }
  } catch (error) {
    console.error('Error accessing localStorage:', error);
  }
  return false;
};

export const getBestScore = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const bestScore = localStorage.getItem('bestScore');
      return bestScore ? parseInt(bestScore, 10) : 0;
    }
  } catch (error) {
    console.error('Error accessing localStorage:', error);
  }
  return 0;
};