export const getBestScore = () => {
  const storedScore = localStorage.getItem('bestScore');
  return storedScore ? parseInt(storedScore, 10) : 0;
};

export const saveBestScore = (score) => {
  const bestScore = getBestScore();
  if (score > bestScore) {
    localStorage.setItem('bestScore', score.toString());
  }
};