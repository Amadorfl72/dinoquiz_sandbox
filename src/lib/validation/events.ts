interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateGameCompletedEvent(eventData: any): ValidationResult {
  const errors: string[] = [];
  
  if (typeof eventData.score !== 'number' || eventData.score < 0 || eventData.score > 10) {
    errors.push('score must be a number between 0 and 10');
  }
  
  if (typeof eventData.duration_ms !== 'number' || eventData.duration_ms <= 0) {
    errors.push('duration_ms must be a positive number');
  }
  
  if (typeof eventData.app_version !== 'string' || !eventData.app_version) {
    errors.push('app_version must be a non-empty string');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}
