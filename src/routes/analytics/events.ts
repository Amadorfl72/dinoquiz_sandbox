import { Router } from 'express';
import { AnalyticsEvent } from '../../models/AnalyticsEvent';
import { validateEvent } from '../../validators/analyticsEventValidator';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { error } = validateEvent(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const event = new AnalyticsEvent({
      eventType: req.body.eventType,
      timestamp: new Date(),
      ...(req.body.eventType === 'app_open' && { 
        firstApertura: req.body.first_apertura 
      }),
      ...(req.body.eventType === 'tooltip_shown' && { 
        tooltipId: req.body.tooltip_id 
      }),
      ...(req.body.eventType === 'tooltip_dismissed' && { 
        tooltipId: req.body.tooltip_id 
      }),
      deviceInfo: req.body.device_info,
      sessionId: req.body.session_id
    });

    await event.save();
    res.status(201).json({ message: 'Event recorded successfully' });
  } catch (err) {
    console.error('Error saving analytics event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;