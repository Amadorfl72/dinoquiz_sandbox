/**
 * Posts analytics data to backend
 * @param {string} endpoint - API endpoint
 * @param {object} data - Event data to send
 */
export const postToAnalytics = async (endpoint, data) => {
  try {
    const response = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Analytics post failed:', error);
    throw error;
  }
};