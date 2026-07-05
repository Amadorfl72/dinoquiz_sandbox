import { logStructured } from '../utils/logger';
import { appVersion } from '../config';

const updateBestScore = (newBest, previousBest) => {
  const isFirstScore = previousBest === null || previousBest === undefined;

  if (isFirstScore || newBest > previousBest) {
    logStructured({
      event: 'best_score_updated',
      new_best: newBest,
      previous_best: previousBest,
      app_version: appVersion,
    });
  }
};

export { updateBestScore };
