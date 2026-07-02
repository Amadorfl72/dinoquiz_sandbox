export const getBestScore = async () => {
  return new Promise((resolve, reject) => {
    try {
      const bestScore = localStorage.getItem('bestScore');
      resolve(bestScore ? parseInt(bestScore) : 0);
    } catch (err) {
      reject(new Error('Storage error'));
    }
  });
};

export const saveBestScore = async (score) => {
  return new Promise((resolve, reject) => {
    try {
      localStorage.setItem('bestScore', score.toString());
      resolve();
    } catch (err) {
      reject(new Error('Storage error'));
    }
  });
};