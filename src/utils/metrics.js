import { initializeAnalytics } from './analytics';

const METRICS_ENDPOINT = '/api/metrics';

// Initialize analytics with consent mode disabled for children under 13
const analytics = initializeAnalytics();

/**
 * Track Largest Contentful Paint (LCP) latency
 * @param {number} lcpValue - LCP value in milliseconds
 */
export const trackLCP = (lcpValue) => {
  if (analytics.isRestrictedMode()) return;
  
  analytics.sendEvent({
    event: 'performance_metric',
    metric_name: 'lcp',
    value: lcpValue,
    unit: 'ms'
  });
};

/**
 * Track JavaScript error rate
 * @param {Error} error - The JavaScript error object
 */
export const trackJSError = (error) => {
  if (analytics.isRestrictedMode()) return;
  
  analytics.sendEvent({
    event: 'js_error',
    error_message: error.message,
    stack_trace: error.stack,
    location: window.location.href
  });
};

/**
 * Track 'game_started' event
 */
export const trackGameStarted = () => {
  if (analytics.isRestrictedMode()) return;
  
  analytics.sendEvent({
    event: 'game_started',
    timestamp: new Date().toISOString()
  });
};

// Listen for global JS errors
window.addEventListener('error', (event) => {
  trackJSError(event.error);
});