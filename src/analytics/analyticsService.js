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

const validatePII = (params) => {
  const piiFields = ['email', 'user_id', 'ip_address', 'name'];
  return piiFields.some(field => params.hasOwnProperty(field));
};

const trackEvent = (eventName, eventParams = {}) => {
  try {
    if (validatePII(eventParams)) {
      throw new Error('PII detected in event parameters');
    }
    const safeParams = sanitizeParams(eventParams);
    
    if (process.env.NODE_ENV === 'production') {
      logEvent(analytics, eventName, safeParams);
    } else {
      console.log(`[Analytics] Event: ${eventName}`, safeParams);
    }
  } catch (error) {
    console.error('[Analytics Tracking Error]', error);
    throw error;
  }
};

export const trackAppOpen = (isFirstOpen) => {
  if (typeof isFirstOpen !== 'boolean') return;
  trackEvent('app_open', { first_apertura: isFirstOpen });
};

export const trackTooltipShown = (tooltipId) => {
  if (!tooltipId) return;
  trackEvent('tooltip_shown', { tooltip_id: tooltipId });
};

export const trackTooltipDismissed = (tooltipId) => {
  if (!tooltipId) return;
  trackEvent('tooltip_dismissed', { tooltip_id: tooltipId });
};

export const handleAnalyticsEvent = async (eventType, eventData) => {
  try {
    switch (eventType) {
      case 'app_open':
        if (typeof eventData?.first_apertura === 'boolean') {
          trackAppOpen(eventData.first_apertura);
          return { status: 'success' };
        }
        break;
      case 'tooltip_shown':
        if (eventData?.tooltip_id) {
          trackTooltipShown(eventData.tooltip_id);
          return { status: 'success' };
        }
        break;
      case 'tooltip_dismissed':
        if (eventData?.tooltip_id) {
          trackTooltipDismissed(eventData.tooltip_id);
          return { status: 'success' };
        }
        break;
      default:
        throw new Error('Invalid event type');
    }
    throw new Error('Invalid event data');
  } catch (error) {
    console.error('[Analytics Event Handling Error]', error);
    throw error;
  }
};