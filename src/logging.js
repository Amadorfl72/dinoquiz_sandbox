import { logEvent } from './analytics';

/**
 * Emits the 'game_completed' structured event to the backend logs endpoint.
 *
 * @param {number} score - Final game score.
 * @param {number} durationMs - Game duration in milliseconds.
 * @param {string} appVersion - Application version.
 * @returns {Promise<void>}
 */
const logGameCompleted = async (score, durationMs, appVersion) => {
  await logEvent('game_completed', {
    score,
    duration_ms: durationMs,
    app_version: appVersion,
  });
};

export { logGameCompleted };
