// Utility to detect first-time load without connection

export const isFirstLoadWithoutConnection = () => {
  try {
    const isFirstLoad = !localStorage.getItem('triofsnd:hasLoadedBefore');
    const isOffline = !navigator.onLine;
    
    if (isFirstLoad && isOffline) {
      return true;
    }
    
    if (isFirstLoad) {
      localStorage.setItem('triofsnd:hasLoadedBefore', 'true');
    }
    
    return false;
  } catch (error) {
    // Fail safely if localStorage is unavailable
    return false;
  }
};