// src/game.js

import { logEvent } from './telemetry.js';
import { recordGameCompleted, recordReplay } from './metrics.js';

let currentScore = 0;

/**
 * Starts a new game.
 * @param {string} trigger - 'initial' or 'replay'
 */
export function startGame(trigger = 'initial') {
  logEvent('game_started', { trigger });
  currentScore = 0;
  // Game initialization logic goes here...
}

/**
 * Completes the current game and records the score.
 * @param {number} score - The final score out of 10.
 */
export function completeGame(score) {
  currentScore = score;
  recordGameCompleted();
  // Show results screen logic goes here...
}

/**
 * Handles the 'Volver a jugar' (Replay) button click.
 */
export function handleReplayClick() {
  logEvent('replay_clicked', {
    previous_score: currentScore,
    timestamp: new Date().toISOString()
  });
  
  recordReplay();
  startGame('replay');
}
