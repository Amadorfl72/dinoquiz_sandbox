export const logEvent = (eventName, eventParams = {}) => {
  if (typeof eventName !== 'string' || !eventName.trim()) {
    throw new Error('Event name must be a non-empty string');
  }

  if (eventParams && typeof eventParams !== 'object') {
    throw new Error('Event parameters must be an object');
  }

  // Sanitize event parameters
  const sanitizedParams = {};
  if (eventParams) {
    Object.entries(eventParams).forEach(([key, value]) => {
      if (typeof key !== 'string' || !key.trim()) {
        throw new Error('Parameter keys must be non-empty strings');
      }
      
      // Only allow numeric values for timestamp parameters
      if (key.toLowerCase().includes('timestamp') || key.toLowerCase().includes('time')) {
        if (typeof value !== 'number' || isNaN(value)) {
          throw new Error('Timestamp parameters must be valid numbers');
        }
        sanitizedParams[key] = value;
      } else {
        // Convert all other values to strings to prevent injection
        sanitizedParams[key] = String(value);
      }
    });
  }

  console.log(`Event: ${eventName}`, sanitizedParams);
  // TODO: Integrate with Firebase Analytics or other analytics service
};