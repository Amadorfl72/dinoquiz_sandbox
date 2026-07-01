import { Router } from 'express';
import { AnalyticsEvent } from '../../models/AnalyticsEvent';
import { validateEvent } from '../../validators/analyticsEventValidator';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const event = req.body;
    
    // Validate event structure and reject PII
    const validationError = validateEvent(event);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    
    // Ensure required deviceInfo is present
    if (!event.deviceInfo) {
      return res.status(400).json({ error: 'Missing required deviceInfo' });
    }
    
    // Store event in database
    const storedEvent = await AnalyticsEvent.create({
      eventType: event.eventType,
      payload: event.payload,
      deviceInfo: event.deviceInfo
    });
    
    res.status(201).json(storedEvent);
  } catch (error) {
    console.error('Error processing analytics event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;