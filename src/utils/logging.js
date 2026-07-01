import { version } from '../../package.json';

/**
 * Logs a structured event when the best score is updated
 * @param {number} newBest - The new best score
 * @param {number} previousBest - The previous best score
 */
export function logBestScoreUpdated(newBest, previousBest) {
  console.log(JSON.stringify({
    event: 'best_score_updated',
    new_best: newBest,
    previous_best: previousBest,
    app_version: version,
    timestamp: new Date().toISOString()
  }));
}

/**
 * Logs a structured event when a storage operation fails
 * @param {string} operation - The storage operation that failed (e.g., 'save', 'load')
 * @param {string} errorType - The type of error that occurred
 */
export function logStorageFailure(operation, errorType) {
  // Normalize errorType to string
  const normalizedErrorType = errorType || 'unknown';
  
  // Truncate operation to a safe length (64 characters)
  const truncatedOperation = operation.length > 64 ? 
    operation.substring(0, 64) : operation;
  
  console.log(JSON.stringify({
    event: 'storage_failure',
    operation: truncatedOperation,
    error_type: normalizedErrorType,
    app_version: version,
    timestamp: new Date().toISOString()
  }));
}