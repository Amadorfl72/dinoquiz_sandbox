import { trackPartidaIniciada } from '../analytics/gameEvents.js';

export function startNewGame(questions) {
  trackPartidaIniciada();
  return {
    questions,
    currentIndex: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
  };
}
