import { getDeviceInfo } from '../utils/deviceInfo';

const ANALYTICS_ENDPOINT = '/api/analytics/events';

const sendAnalyticsEvent = async (eventType, eventData = {}) => {
  try {
    const deviceInfo = getDeviceInfo();
    
    const payload = {
      eventType,
      timestamp: new Date().toISOString(),
      ...eventData,
      deviceInfo,
    };

    await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Error sending analytics event:', error);
  }
};

export const trackAppOpen = (isFirstOpen) => {
  sendAnalyticsEvent('app_open', { first_apertura: isFirstOpen });
};

export const trackTooltipShown = (tooltipId) => {
  sendAnalyticsEvent('tooltip_shown', { tooltipId });
};

export const trackTooltipDismissed = (tooltipId) => {
  sendAnalyticsEvent('tooltip_dismissed', { tooltipId });
};