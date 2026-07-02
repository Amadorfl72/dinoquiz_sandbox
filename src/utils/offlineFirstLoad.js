// Utility to detect first-time load without connection
const isFirstLoad = () => {
  return !localStorage.getItem('gameDownloaded');
};

const setGameDownloaded = () => {
  localStorage.setItem('gameDownloaded', 'true');
};

const isOnline = () => {
  return navigator.onLine;
};

export const checkOfflineFirstLoad = () => {
  if (isFirstLoad() && !isOnline()) {
    return true;
  }
  if (isOnline()) {
    setGameDownloaded();
  }
  return false;
};