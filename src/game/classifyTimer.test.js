'use strict';

const { STATUS, DEFAULT_BONUS_WINDOW_MS, createTimer } = require('./classifyTimer');

function buildClock(startMs) {
  let current = startMs;
  return {
    now: () => current,
    advance(ms) {
      current += ms;
    },
  };
}

function buildFakeDocument(initialHidden) {
  const listeners = [];
  return {
    hidden: initialHidden,
    addEventListener(eventName, handler) {
      if (eventName === 'visibilitychange') {
        listeners.push(handler);
      }
    },
    removeEventListener(eventName, handler) {
      if (eventName === 'visibilitychange') {
        const index = listeners.indexOf(handler);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    },
    setHidden(hidden) {
      this.hidden = hidden;
      listeners.slice().forEach((handler) => handler());
    },
    listenerCount() {
      return listeners.length;
    },
  };
}

describe('createTimer', () => {
  test('starts active and bonus-eligible with zero elapsed time', () => {
    const clock = buildClock(0);
    const timer = createTimer({ now: clock.now, autoListen: false });

    const state = timer.getState();
    expect(state.status).toBe(STATUS.ACTIVE);
    expect(state.elapsedMs).toBe(0);
    expect(state.remainingMs).toBe(DEFAULT_BONUS_WINDOW_MS);
    expect(state.bonusEligible).toBe(true);
  });

  test('tracks elapsed time while active', () => {
    const clock = buildClock(0);
    const timer = createTimer({ now: clock.now, durationMs: 5000, autoListen: false });

    clock.advance(2000);

    const state = timer.getState();
    expect(state.status).toBe(STATUS.ACTIVE);
    expect(state.elapsedMs).toBe(2000);
    expect(state.remainingMs).toBe(3000);
    expect(state.bonusEligible).toBe(true);
  });

  test('expires once the elapsed time reaches durationMs, but never throws or blocks reads', () => {
    const clock = buildClock(0);
    const timer = createTimer({ now: clock.now, durationMs: 3000, autoListen: false });

    clock.advance(3000);

    const state = timer.getState();
    expect(state.status).toBe(STATUS.EXPIRED);
    expect(state.elapsedMs).toBe(3000);
    expect(state.remainingMs).toBe(0);
    expect(state.bonusEligible).toBe(false);
  });

  test('never reports elapsed/remaining past durationMs once expired', () => {
    const clock = buildClock(0);
    const timer = createTimer({ now: clock.now, durationMs: 1000, autoListen: false });

    clock.advance(50000);

    const state = timer.getState();
    expect(state.status).toBe(STATUS.EXPIRED);
    expect(state.elapsedMs).toBe(1000);
    expect(state.remainingMs).toBe(0);
  });

  test('pause() banks the elapsed time and stops the clock', () => {
    const clock = buildClock(0);
    const timer = createTimer({ now: clock.now, durationMs: 5000, autoListen: false });

    clock.advance(1000);
    timer.pause();
    clock.advance(10000); // time passes while paused -- must never be counted

    const state = timer.getState();
    expect(state.status).toBe(STATUS.PAUSED);
    expect(state.elapsedMs).toBe(1000);
    expect(state.bonusEligible).toBe(true);
  });

  test('resume() continues from exactly the elapsed time it was paused with', () => {
    const clock = buildClock(0);
    const timer = createTimer({ now: clock.now, durationMs: 5000, autoListen: false });

    clock.advance(1000);
    timer.pause();
    clock.advance(10000);
    timer.resume();
    clock.advance(500);

    const state = timer.getState();
    expect(state.status).toBe(STATUS.ACTIVE);
    expect(state.elapsedMs).toBe(1500);
    expect(state.remainingMs).toBe(3500);
  });

  test('resuming after the banked elapsed time already reached durationMs lands on EXPIRED', () => {
    const clock = buildClock(0);
    const timer = createTimer({ now: clock.now, durationMs: 1000, autoListen: false });

    clock.advance(1000);
    timer.pause();
    timer.resume();

    expect(timer.getState().status).toBe(STATUS.EXPIRED);
  });

  test('pause() is a no-op once expired', () => {
    const clock = buildClock(0);
    const timer = createTimer({ now: clock.now, durationMs: 1000, autoListen: false });

    clock.advance(2000);
    timer.pause();

    expect(timer.getState().status).toBe(STATUS.EXPIRED);
  });

  test('resume() is a no-op while active', () => {
    const clock = buildClock(0);
    const timer = createTimer({ now: clock.now, durationMs: 5000, autoListen: false });

    clock.advance(100);
    timer.resume();

    const state = timer.getState();
    expect(state.status).toBe(STATUS.ACTIVE);
    expect(state.elapsedMs).toBe(100);
  });

  test('a slow answer is never an error: getState keeps reporting a plain status after expiry', () => {
    const clock = buildClock(0);
    const timer = createTimer({ now: clock.now, durationMs: 1000, autoListen: false });

    clock.advance(1000);

    expect(() => timer.getState()).not.toThrow();
    expect(timer.getState().status).toBe(STATUS.EXPIRED);
  });

  test('pauses automatically when the document loses visibility', () => {
    const clock = buildClock(0);
    const fakeDocument = buildFakeDocument(false);
    const timer = createTimer({ now: clock.now, durationMs: 5000, documentObj: fakeDocument });

    clock.advance(1000);
    fakeDocument.setHidden(true);
    clock.advance(10000);

    const state = timer.getState();
    expect(state.status).toBe(STATUS.PAUSED);
    expect(state.elapsedMs).toBe(1000);
  });

  test('resumes without penalizing the hidden interval when visibility returns', () => {
    const clock = buildClock(0);
    const fakeDocument = buildFakeDocument(false);
    const timer = createTimer({ now: clock.now, durationMs: 5000, documentObj: fakeDocument });

    clock.advance(1000);
    fakeDocument.setHidden(true);
    clock.advance(10000);
    fakeDocument.setHidden(false);
    clock.advance(500);

    const state = timer.getState();
    expect(state.status).toBe(STATUS.ACTIVE);
    expect(state.elapsedMs).toBe(1500);
  });

  test('off() detaches the visibilitychange listener', () => {
    const clock = buildClock(0);
    const fakeDocument = buildFakeDocument(false);
    const timer = createTimer({ now: clock.now, durationMs: 5000, documentObj: fakeDocument });

    expect(fakeDocument.listenerCount()).toBe(1);
    timer.off();
    expect(fakeDocument.listenerCount()).toBe(0);

    clock.advance(1000);
    fakeDocument.hidden = true; // no dispatch, listener detached

    expect(timer.getState().status).toBe(STATUS.ACTIVE);
  });

  test('autoListen: false never subscribes to visibilitychange', () => {
    const fakeDocument = buildFakeDocument(false);
    createTimer({ durationMs: 5000, documentObj: fakeDocument, autoListen: false });

    expect(fakeDocument.listenerCount()).toBe(0);
  });

  test('defaults to Date.now and the default bonus window when no options are given', () => {
    const timer = createTimer({ autoListen: false });
    const state = timer.getState();

    expect(state.status).toBe(STATUS.ACTIVE);
    expect(state.remainingMs).toBe(DEFAULT_BONUS_WINDOW_MS);
  });
});
