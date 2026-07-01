export const saveBestScore = (score) => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.setItem('bestScore', score.toString());
    }
  } catch (error) {
    console.error('Failed to save best score:', error);
  }
};

export const getBestScore = () => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      const score = localStorage.getItem('bestScore');
      return score ? parseInt(score, 10) : 0;
    }
  } catch (error) {
    console.error('Failed to retrieve best score:', error);
  }
  return 0;
};