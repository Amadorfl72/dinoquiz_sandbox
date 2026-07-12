import {
  incrementCounter,
  getCounter,
  getCounters,
  getReplayRate,
  resetCounters,
} from './localAnalyticsStore.js';
import { REPLAY_PULSADO, PARTIDA_INICIADA } from './eventNames.js';

beforeEach(() => {
  window.localStorage.clear();
  resetCounters();
});

test('increments a counter from zero', () => {
  expect(getCounter(PARTIDA_INICIADA)).toBe(0);
  incrementCounter(PARTIDA_INICIADA);
  expect(getCounter(PARTIDA_INICIADA)).toBe(1);
});

test('increments independently per event name', () => {
  incrementCounter(PARTIDA_INICIADA);
  incrementCounter(PARTIDA_INICIADA);
  incrementCounter(REPLAY_PULSADO);
  const counters = getCounters();
  expect(counters[PARTIDA_INICIADA]).toBe(2);
  expect(counters[REPLAY_PULSADO]).toBe(1);
});

test('persists counters across store re-reads', () => {
  incrementCounter(PARTIDA_INICIADA);
  const raw = window.localStorage.getItem('dinoquiz_analytics_v1');
  expect(raw).not.toBeNull();
  expect(getCounter(PARTIDA_INICIADA)).toBe(1);
});

test('computes replay rate from aggregated counters', () => {
  incrementCounter(PARTIDA_INICIADA);
  incrementCounter(PARTIDA_INICIADA);
  incrementCounter(PARTIDA_INICIADA);
  incrementCounter(PARTIDA_INICIADA);
  incrementCounter(REPLAY_PULSADO);
  incrementCounter(REPLAY_PULSADO);
  expect(getReplayRate(REPLAY_PULSADO, PARTIDA_INICIADA)).toBe(0.5);
});

test('replay rate is zero when no games have started', () => {
  expect(getReplayRate(REPLAY_PULSADO, PARTIDA_INICIADA)).toBe(0);
});

test('does not record events when analytics is restricted', () => {
  window.localStorage.setItem('dinoquiz_analytics_restricted', 'true');
  incrementCounter(PARTIDA_INICIADA);
  expect(getCounter(PARTIDA_INICIADA)).toBe(0);
});

test('resetCounters clears all aggregated counts', () => {
  incrementCounter(PARTIDA_INICIADA);
  resetCounters();
  expect(getCounters()).toEqual({});
});
