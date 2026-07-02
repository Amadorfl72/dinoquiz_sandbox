export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const language = navigator.language;
  
  return {
    userAgent,
    screenWidth,
    screenHeight,
    language,
  };
};
