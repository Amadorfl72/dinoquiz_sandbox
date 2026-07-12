import { trackReplayPulsado, trackPartidaIniciada } from './gameEvents.js';
import { getCounter, resetCounters } from './localAnalyticsStore.js';
import { REPLAY_PULSADO, PARTIDA_INICIADA } from './eventNames.js';

beforeEach(() => {
  window.localStorage.clear();
  resetCounters();
});

test('trackPartidaIniciada increments the partida_iniciada counter', () => {
  trackPartidaIniciada();
  expect(getCounter(PARTIDA_INICIADA)).toBe(1);
});

test('trackReplayPulsado increments the replay_pulsado counter', () => {
  trackReplayPulsado();
  trackReplayPulsado();
  expect(getCounter(REPLAY_PULSADO)).toBe(2);
});

test('replay button flow tracks replay_pulsado and, via a new game, partida_iniciada', () => {
  trackReplayPulsado();
  trackPartidaIniciada();
  expect(getCounter(REPLAY_PULSADO)).toBe(1);
  expect(getCounter(PARTIDA_INICIADA)).toBe(1);
});
