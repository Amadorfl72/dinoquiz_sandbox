export const saveBestScore = (score) => {
  const bestScore = localStorage.getItem('bestScore');
  if (!bestScore || score > parseInt(bestScore)) {
    localStorage.setItem('bestScore', score);
  }
};

export const getBestScore = () => {
  return parseInt(localStorage.getItem('bestScore')) || 0;
};