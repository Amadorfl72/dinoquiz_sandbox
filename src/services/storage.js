import { logStorageFailure } from '../utils/logging';

export function saveBestScore(score) {
  try {
    localStorage.setItem('bestScore', score.toString());
    return true;
  } catch (error) {
    logStorageFailure('save', error.name);
    return false;
  }
}

export function loadBestScore() {
  try {
    const score = localStorage.getItem('bestScore');
    return score ? parseInt(score, 10) : 0;
  } catch (error) {
    logStorageFailure('load', error.name);
    return 0;
  }
}