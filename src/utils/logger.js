import * as logger from './logger';

const logStructured = (payload) => {
  console.log(JSON.stringify(payload));
};

const logBestScoreUpdated = (new_best, previous_best, app_version) => {
  logger.logStructured({
    event: 'best_score_updated',
    new_best,
    previous_best,
    app_version
  });
};

const logStorageFailure = (operation, error_type, app_version) => {
  logger.logStructured({
    event: 'storage_failure',
    operation,
    error_type: error_type || 'UnknownError',
    app_version
  });
};

export { logStructured, logBestScoreUpdated, logStorageFailure };