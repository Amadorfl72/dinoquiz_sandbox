// Utility to detect first-time load without connection

export const isFirstLoadWithoutConnection = () => {
  const isFirstLoad = !localStorage.getItem('hasLoadedBefore');
  const isOffline = !navigator.onLine;
  
  if (isFirstLoad && isOffline) {
    return true;
  }
  
  if (isFirstLoad) {
    localStorage.setItem('hasLoadedBefore', 'true');
  }
  
  return false;
};