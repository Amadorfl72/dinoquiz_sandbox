export const getAppVersion = () => {
  return process.env.REACT_APP_VERSION || '1.0.0';
};