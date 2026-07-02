import { logEvent } from 'firebase/analytics';

const logBestScoreUpdated = (newBest, previousBest, appVersion) => {
  logEvent('best_score_updated', {
    newBest,
    previousBest,
    appVersion
  });
};

const logStorageFailure = (operation, errorType, appVersion) => {
  logEvent('storage_failure', {
    operation,
    errorType,
    appVersion
  });
};

export { logBestScoreUpdated, logStorageFailure };