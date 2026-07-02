import { sendMetric } from './api';

// Track Largest Contentful Paint (LCP) latency
export const trackLCP = () => {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    sendMetric('lcp_latency', lastEntry.renderTime || lastEntry.loadTime);
  });
  observer.observe({ type: 'largest-contentful-paint', buffered: true });
};

// Track JavaScript error rate
export const trackJSErrors = () => {
  window.onerror = (message, source, lineno, colno, error) => {
    sendMetric('js_error_rate', { message, source, lineno, colno, error });
  };
};

// Send 'game_started' metric
export const trackGameStarted = () => {
  sendMetric('game_started', { timestamp: new Date().toISOString() });
};