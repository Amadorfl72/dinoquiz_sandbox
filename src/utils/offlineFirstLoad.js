// Utility to detect first-time load without connection
const isFirstLoad = () => {
  return !localStorage.getItem('hasLoadedBefore');
};

const setFirstLoad = () => {
  localStorage.setItem('hasLoadedBefore', 'true');
};

const isOnline = () => {
  return navigator.onLine;
};

export const checkOfflineFirstLoad = () => {
  if (isFirstLoad() && !isOnline()) {
    return true;
  }
  setFirstLoad();
  return false;
};