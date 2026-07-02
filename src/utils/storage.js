export const getBestScore = async () => {
  return new Promise((resolve) => {
    const bestScore = localStorage.getItem('bestScore');
    resolve(bestScore ? parseInt(bestScore, 10) : 0);
  });
};

export const setBestScore = async (score) => {
  return new Promise((resolve) => {
    localStorage.setItem('bestScore', score.toString());
    resolve();
  });
};