// src/telemetry/events.js

export const emitReplayClicked = (previousScore) => {
  if (window.gtag) {
    window.gtag('event', 'replay_clicked', {
      previous_score: previousScore,
      timestamp: Date.now()
    });
  }
};

export const emitGameStarted = (trigger = 'initial') => {
  if (window.gtag) {
    window.gtag('event', 'game_started', {
      trigger: trigger
    });
  }
};

export const emitGameOver = (score) => {
  if (window.gtag) {
    window.gtag('event', 'game_over', {
      score: score,
      timestamp: Date.now()
    });
  }
  // Store game over time for replay rate calculation
  localStorage.setItem('lastGameOverTime', Date.now());
};