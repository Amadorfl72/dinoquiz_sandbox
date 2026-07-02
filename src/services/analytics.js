export const logEvent = (eventName, eventParams = {}) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${eventName}`, eventParams);
  }
  // TODO: Implement actual analytics service integration
  // For example: Firebase Analytics, Plausible, etc.
};