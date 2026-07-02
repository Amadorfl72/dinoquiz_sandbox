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
};

export const logAppOpen = () => {
  logEvent('app_open', {});
};

export const logGameStarted = () => {
  logEvent('game_started', {});
};