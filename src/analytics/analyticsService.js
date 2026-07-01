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

const sanitizeParams = (params) => {
  const sanitized = {};
  for (const key in params) {
    if (typeof params[key] !== 'object' && typeof params[key] !== 'function') {
      sanitized[key] = params[key];
    }
  }
  return sanitized;
};

const trackEvent = (eventName, eventParams = {}) => {
  try {
    const safeParams = sanitizeParams(eventParams);
    
    if (process.env.NODE_ENV === 'production') {
      logEvent(analytics, eventName, safeParams);
    } else {
      console.log(`[Analytics] Event: ${eventName}`, safeParams);
    }
  } catch (error) {
    console.error('[Analytics Tracking Error]', error);
  }
};

export const trackAppOpen = (isFirstOpen) => {
  if (typeof isFirstOpen !== 'boolean') return;
  trackEvent('app_open', { first_apertura: isFirstOpen });
};

export const trackTooltipShown = () => {
  trackEvent('tooltip_shown');
};

export const trackTooltipDismissed = () => {
  trackEvent('tooltip_dismissed');
};