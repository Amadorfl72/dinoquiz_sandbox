import { post } from './apiService';

const METRICS_ENDPOINT = '/metrics';

export const sendGameStartedMetric = async () => {
  try {
    await post(METRICS_ENDPOINT, { event: 'game_started' });
  } catch (error) {
    console.error('Failed to send game_started metric:', error);
  }
};