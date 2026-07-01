export const logEvent = (eventName: string, params?: Record<string, any>) => {
  // Implementation to send event to analytics service
  console.log(`Event: ${eventName}`, params);
};