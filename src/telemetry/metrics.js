// src/telemetry/metrics.js

// Calculate and emit replay rate metric (< 5 minutes)
export const calculateReplayRate = (replayClickTime) => {
  const lastGameOverTime = localStorage.getItem('lastGameOverTime');
  
  if (!lastGameOverTime) return;
  
  const timeDiffSeconds = (replayClickTime - parseInt(lastGameOverTime)) / 1000;
  
  // Only consider replays within 5 minutes (300 seconds)
  if (timeDiffSeconds <= 300 && timeDiffSeconds >= 0) {
    if (window.gtag) {
      window.gtag('event', 'replay_rate_under_5min', {
        value: 1
      });
    }
  }
  
  // Clear the stored game over time after calculation
  localStorage.removeItem('lastGameOverTime');
};