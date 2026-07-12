import { incrementCounter } from './localAnalyticsStore.js';
import { REPLAY_PULSADO, PARTIDA_INICIADA } from './eventNames.js';

export function trackReplayPulsado() {
  incrementCounter(REPLAY_PULSADO);
}

export function trackPartidaIniciada() {
  incrementCounter(PARTIDA_INICIADA);
}
