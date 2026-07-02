export const logEvent = (eventName, eventParams = {}) => {
  console.log(`Event: ${eventName}`, eventParams);
  // TODO: Integrate with Firebase Analytics or other analytics service
};