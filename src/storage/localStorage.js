// Local storage functions for persisting game data

export const saveBestScore = (score) => {
  try {
    localStorage.setItem('bestScore', score.toString());
  } catch (error) {
    console.error('Error saving best score:', error);
  }
};

export const loadBestScore = () => {
  try {
    const score = localStorage.getItem('bestScore');
    return score ? parseInt(score, 10) : 0;
  } catch (error) {
    console.error('Error loading best score:', error);
    return 0;
  }
};
