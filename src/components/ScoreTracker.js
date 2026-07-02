import { logBestScoreUpdated } from '../utils/logger';

const updateBestScore = (newScore, previousScore) => {
  logBestScoreUpdated(newScore, previousScore, process.env.APP_VERSION);
  // Logic to update the best score
};

export { updateBestScore };