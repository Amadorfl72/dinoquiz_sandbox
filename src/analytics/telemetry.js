// Telemetry module for DinoQuiz

export const Telemetry = {
  // Track replay events
  logReplayClicked: function(previousScore) {
    const event = {
      name: 'replay_clicked',
      timestamp: new Date().toISOString(),
      previous_score: previousScore
    };
    this._sendEvent(event);
  },

  // Track game started with replay trigger
  logGameStarted: function(trigger) {
    const event = {
      name: 'game_started',
      timestamp: new Date().toISOString(),
      trigger: trigger
    };
    this._sendEvent(event);
  },

  // Calculate and emit replay rate within 5 minutes
  calculateReplayRate: function() {
    const replayRate = this._calculateRate('replay');
    this._emitMetric('replay_rate', replayRate, { window_minutes: 5 });
    return replayRate;
  },

  // Private method to send events to analytics backend
  _sendEvent: function(event) {
    // Implementation for actual analytics backend
    if (window.analytics) {
      window.analytics.track(event.name, {
        timestamp: event.timestamp,
        ...(event.previous_score !== undefined && { previous_score: event.previous_score }),
        ...(event.trigger && { trigger: event.trigger })
      });
    }
    console.log('Telemetry event:', event);
  },

  // Private method to emit metrics
  _emitMetric: function(name, value, attributes) {
    if (window.analytics) {
      window.analytics.metric(name, value, attributes);
    }
    console.log('Telemetry metric:', name, value, attributes);
  },

  // Private method to calculate rate
  _calculateRate: function(trigger) {
    // In a real implementation, this would query the analytics backend
    // for events in the last 5 minutes and calculate the rate
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Mock implementation - would be dynamic in real app
    const totalGames = 10; 
    const replayGames = 4; 
    return replayGames / totalGames;
  }
};