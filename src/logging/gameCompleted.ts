import { getAppVersion } from '../utils/appInfo';
import { postToAnalytics } from '../utils/api';

interface GameCompletedPayload {
  score: number;
  duration_ms: number;
  app_version: string;
}

export const logGameCompleted = async (payload: GameCompletedPayload) => {
  if (typeof payload.score !== 'number') {
    throw new Error('Missing required field: score');
  }
  if (typeof payload.duration_ms !== 'number') {
    throw new Error('Missing required field: duration_ms');
  }
  if (!payload.app_version) {
    payload.app_version = getAppVersion();
  }

  const eventData = {
    event: 'game_completed',
    timestamp: new Date().toISOString(),
    data: {
      score: payload.score,
      duration_ms: payload.duration_ms,
      app_version: payload.app_version
    }
  };

  try {
    await postToAnalytics('/events', eventData);
  } catch (error) {
    console.error('Failed to log game_completed event:', error);
  }
};