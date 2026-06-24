// src/metrics.js

import { logEvent } from './telemetry.js';

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

let lastGameCompletionTime = null;
let totalCompletions = 0;
let totalReplays = 0;

/**
 * Records that a game has been completed.
 */
export function recordGameCompleted() {
  totalCompletions++;
  lastGameCompletionTime = Date.now();
}

/**
 * Records a replay action and calculates the replay rate if within the 5-minute window.
 */
export function recordReplay() {
  totalReplays++;
  
  if (lastGameCompletionTime) {
    const timeSinceCompletion = Date.now() - lastGameCompletionTime;
    
    if (timeSinceCompletion < REPLAY_WINDOW_MS) {
      const replayRate = totalCompletions > 0 
        ? (totalReplays / totalCompletions) * 100 
        : 0;
        
      logEvent('replay_rate_calculated', {
        replay_rate: parseFloat(replayRate.toFixed(2)),
        within_5_min: true,
        total_completions: totalCompletions,
        total_replays: totalReplays
      });
    }
  }
}
