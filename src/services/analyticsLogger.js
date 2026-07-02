import { logEvent } from 'firebase/analytics';

const analyticsLogger = {
  logEvent: (eventName, eventPayload) => {
    logEvent(eventName, eventPayload);
  }
};

export default analyticsLogger;