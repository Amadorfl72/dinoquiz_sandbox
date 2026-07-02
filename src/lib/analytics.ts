import { AnalyticsEvent } from '../types';

export async function logEvent(eventType: string, eventData: any): Promise<void> {
  // In production, this would send to your analytics service
  // For now, just log to console and/or local storage for debugging
  const event: AnalyticsEvent = {
    type: eventType,
    data: eventData,
    timestamp: new Date().toISOString()
  };
  
  console.log('Analytics event:', event);
  
  // Store locally for debugging (optional)
  if (typeof window !== 'undefined') {
    const events = JSON.parse(localStorage.getItem('analyticsEvents') || '[]');
    events.push(event);
    localStorage.setItem('analyticsEvents', JSON.stringify(events));
  }
}
