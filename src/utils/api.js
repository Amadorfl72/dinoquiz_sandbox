// Mock function to send metrics to backend endpoint
export const sendMetric = (metricName, data) => {
  const endpoint = 'https://api.dinoquiz.com/metrics';
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metricName, data })
  }).catch((error) => console.error('Failed to send metric:', error));
};