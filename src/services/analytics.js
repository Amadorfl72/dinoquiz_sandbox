import { analyticsLogger } from './analyticsLogger';

export const logEvent = (eventName, eventParams = {}) => {
  analyticsLogger.emit({
    event: eventName,
    ...eventParams
  });
};