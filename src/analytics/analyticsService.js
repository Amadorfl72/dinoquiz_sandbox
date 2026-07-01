import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const trackEvent = (eventName, eventParams = {}) => {
  if (process.env.NODE_ENV === 'production') {
    logEvent(analytics, eventName, eventParams);
  } else {
    console.log(`[Analytics] Event: ${eventName}`, eventParams);
  }
};

export const trackAppOpen = (isFirstOpen) => {
  trackEvent('app_open', { first_apertura: isFirstOpen });
};

export const trackTooltipShown = () => {
  trackEvent('tooltip_shown');
};

export const trackTooltipDismissed = () => {
  trackEvent('tooltip_dismissed');
};
