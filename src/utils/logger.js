import { version } from '../../package.json';

const logEvent = (eventType, eventData) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    app_version: version,
    locale: navigator.language || 'es',
    ...eventData
  };
  
  console.log(JSON.stringify(logEntry));
  return logEntry;
};

export const logAppOpen = () => {
  return logEvent('app_open', {});
};

export const logGameStarted = () => {
  return logEvent('game_started', {});
};
