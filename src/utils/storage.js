export const getBestScore = () => {
  return localStorage.getItem('bestScore') || 0;
};

export const saveBestScore = (score) => {
  const bestScore = getBestScore();
  if (score > bestScore) {
    localStorage.setItem('bestScore', score);
  }
};