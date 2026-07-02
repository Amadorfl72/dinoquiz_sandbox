import { storage } from './storage';

const BEST_SCORE_KEY = 'triofsnd:bestScore';

export const getBestScore = () => storage.get(BEST_SCORE_KEY, 0);

export const setBestScore = (score) => storage.set(BEST_SCORE_KEY, score);

export const isNewBestScore = (currentScore) => {
  const bestScore = getBestScore();
  return currentScore > bestScore;
};