export const saveBestScore = (score) => {
  try {
    const currentBest = getBestScore();
    
    if (score > currentBest) {
      localStorage.setItem('bestScore', score.toString());
      return '¡Nuevo récord!';
    }
    
    return null;
  } catch (error) {
    // Silently fail if localStorage is disabled
    return null;
  }
};

export const getBestScore = () => {
  try {
    const bestScore = localStorage.getItem('bestScore');
    return bestScore ? parseInt(bestScore, 10) : 0;
  } catch (error) {
    return 0;
  }
};