import { logEvent } from './analytics';

const logGameCompleted = async (score, durationMs, appVersion) => {
  await logEvent('game_completed', {
    score,
    duration_ms: durationMs,
    app_version: appVersion
  });
};

export { logGameCompleted };