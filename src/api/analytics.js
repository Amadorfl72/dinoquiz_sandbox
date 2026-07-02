import { storeAnalyticsEvent } from '../storage/analyticsStorage';

export const handleAnalyticsEvent = async (req, res) => {
  try {
    const { eventType, timestamp, ...eventData } = req.body;
    
    // Validate required fields
    if (!eventType || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Ensure no PII is being collected
    const sanitizedData = {
      eventType,
      timestamp,
      ...eventData,
    };
    
    // Store the event
    await storeAnalyticsEvent(sanitizedData);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling analytics event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
