import { NextApiRequest, NextApiResponse } from 'next';
import { validateGameCompletedEvent } from '../../../lib/validation/events';
import { logEvent } from '../../../lib/analytics';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const eventData = req.body;
    
    // Validate the event data structure
    const validationResult = validateGameCompletedEvent(eventData);
    if (!validationResult.valid) {
      return res.status(400).json({ 
        message: 'Invalid event data',
        errors: validationResult.errors
      });
    }

    // Log the validated event
    await logEvent('game_completed', eventData);
    
    return res.status(201).json({ message: 'Event received' });
  } catch (error) {
    console.error('Error processing game_completed event:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}