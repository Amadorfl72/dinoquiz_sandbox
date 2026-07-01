import { getAppVersion } from './appInfo';
import { postToAnalytics } from './api';

/**
 * Logs a game_completed event with score, duration, and version
 * @param {number} score - Final score (X/10)
 * @param {number} durationMs - Total game duration in milliseconds
 */
export const logGameCompleted = async (score, durationMs) => {
  try {
    const eventData = {
      event_type: 'game_completed',
      timestamp: new Date().toISOString(),
      data: {
        score,
        duration_ms: durationMs,
        app_version: getAppVersion(),
      },
    };

    await postToAnalytics('/events', eventData);
  } catch (error) {
    console.error('Failed to log game_completed event:', error);
  }
};