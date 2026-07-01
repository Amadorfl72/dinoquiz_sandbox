import { logger } from './logger';

export const logEvent = (eventName: string, params?: Record<string, any>) => {
  logger.log(eventName, params);
};