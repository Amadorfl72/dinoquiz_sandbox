const logEvent = async (eventName, eventData) => {
  try {
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: eventName,
        ...eventData,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to log event');
    }
  } catch (error) {
    console.error('Error logging event:', error);
  }
};

export { logEvent };