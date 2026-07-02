export const saveBestScore = (score) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dinoQuizBestScore', score.toString());
    }
  } catch (error) {
    console.error('Failed to save best score:', error);
  }
};

export const getBestScore = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const score = localStorage.getItem('dinoQuizBestScore');
      return score ? parseInt(score, 10) : 0;
    }
    return 0;
  } catch (error) {
    console.error('Failed to retrieve best score:', error);
    return 0;
  }
};