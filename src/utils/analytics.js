// Mock analytics module with consent mode support

export const initializeAnalytics = () => {
  let isRestrictedMode = false;
  
  return {
    /**
     * Set restricted mode based on age gate selection
     * @param {boolean} restricted - Whether analytics should be restricted
     */
    setRestrictedMode: (restricted) => {
      isRestrictedMode = restricted;
    },
    
    /**
     * Check if analytics is in restricted mode
     * @returns {boolean} - True if analytics is restricted
     */
    isRestrictedMode: () => isRestrictedMode,
    
    /**
     * Send analytics event to backend
     * @param {object} event - The event data to send
     */
    sendEvent: (event) => {
      if (isRestrictedMode) return;
      
      // In production, this would send to your analytics backend
      console.log('[Analytics]', event);
      
      // Example fetch to metrics endpoint
      // fetch(METRICS_ENDPOINT, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event)
      // });
    }
  };
};