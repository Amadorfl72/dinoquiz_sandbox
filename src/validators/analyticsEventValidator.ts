const PII_FIELDS = ['email', 'name', 'phone', 'address', 'username', 'ip'];

export function validateEvent(event: any): string | null {
  if (!event || typeof event !== 'object') {
    return 'Invalid event format';
  }
  
  // Check for required fields
  if (!event.eventType || !['app_open', 'tooltip_shown', 'tooltip_dismissed'].includes(event.eventType)) {
    return 'Invalid or missing eventType';
  }
  
  // Check for PII fields
  for (const field of PII_FIELDS) {
    if (event.payload && event.payload[field]) {
      return `Event contains prohibited PII field: ${field}`;
    }
  }
  
  // Validate specific event types
  if (event.eventType === 'app_open' && typeof event.payload.first_apertura !== 'boolean') {
    return 'app_open events require first_apertura boolean flag';
  }
  
  if ((event.eventType === 'tooltip_shown' || event.eventType === 'tooltip_dismissed') && 
      !event.payload.tooltip_id) {
    return 'tooltip events require tooltip_id';
  }
  
  return null;
}