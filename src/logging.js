import { logEvent } from './analytics';

const logGameCompleted = (score, durationMs, appVersion) => {
  logEvent('game_completed', {
    score,
    duration_ms: durationMs,
    app_version: appVersion
  });
};

export { logGameCompleted };