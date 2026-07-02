export async function setBestScore(score) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('dinoQuizBestScore', score.toString());
    }
  } catch (err) {
    throw new Error('Storage failure');
  }
}

export async function getBestScore() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const score = localStorage.getItem('dinoQuizBestScore');
      return score ? parseInt(score, 10) : 0;
    }
    return 0;
  } catch (err) {
    console.error('Failed to retrieve best score:', err);
    return 0;
  }
}