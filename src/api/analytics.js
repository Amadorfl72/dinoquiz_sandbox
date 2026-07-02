import { storeAnalyticsEvent } from '../storage/analyticsStorage';

const PII_FIELDS = ['email', 'phone', 'address', 'name', 'user_id', 'ip'];

export const handleAnalyticsEvent = async (req, res) => {
  try {
    const { eventType, timestamp, ...eventData } = req.body;
    
    // Validate required fields
    if (!eventType || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check for PII in event data
    const hasPII = PII_FIELDS.some(field => {
      return field in eventData || 
             (typeof eventData === 'object' && 
              Object.values(eventData).some(
                val => typeof val === 'object' && field in val
              ));
    });
    
    if (hasPII) {
      return res.status(400).json({ error: 'Payload contains prohibited PII' });
    }
    
    // Store the event
    await storeAnalyticsEvent({
      eventType,
      timestamp,
      ...eventData,
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling analytics event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};