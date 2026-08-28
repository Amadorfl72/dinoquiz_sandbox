'use strict';

const { attachToSession } = require('./visibilityPauseService');
const { startGame, evaluateAnswer, advanceRound, HOOK_EVENTS } = require('../game/roundContract');

function buildGenerateRound() {
  let calls = 0;
  return () => {
    calls += 1;
    return { prompt: `round-${calls}` };
  };
}

function startSession() {
  return startGame({ generateRound: buildGenerateRound() });
}

/** A minimal fake `document` this service can attach a `visibilitychange` listener to. */
function createFakeDocument(initialHidden = false) {
  const listeners = [];
  return {
    hidden: initialHidden,
    addEventListener(event, handler) {
      if (event === 'visibilitychange') {
        listeners.push(handler);
      }
    },
    removeEventListener(event, handler) {
      if (event === 'visibilitychange') {
        const index = listeners.indexOf(handler);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    },
    hide() {
      this.hidden = true;
      listeners.slice().forEach((handler) => handler());
    },
    show() {
      this.hidden = false;
      listeners.slice().forEach((handler) => handler());
    },
    listenerCount() {
      return listeners.length;
    },
  };
}

function createSessionBox(session) {
  let current = session;
  return {
    get: () => current,
    set: (next) => {
      current = next;
    },
    current: () => current,
  };
}

function createFakeAudio() {
  return {
    paused: false,
    ended: false,
    played: 0,
    pause() {
      this.paused = true;
    },
    play() {
      this.paused = false;
      this.played += 1;
      return Promise.resolve();
    },
  };
}

describe('visibilityPauseService.attachToSession (TRIOFSND-244)', () => {
  test('hiding the document pauses the roundContract session (evaluate/advance rejected, no penalty)', () => {
    const documentObj = createFakeDocument();
    const session = startSession();
    const box = createSessionBox(session);

    attachToSession({ getSession: box.get, setSession: box.set, documentObj });

    documentObj.hide();

    expect(box.current().status).toBe('paused');
    const rejected = evaluateAnswer(box.current(), { isCorrect: true });
    expect(rejected.accepted).toBe(false);
    expect(rejected.session.state.score).toBe(0);
  });

  test('showing the document again resumes the session back to playing', () => {
    const documentObj = createFakeDocument();
    const session = startSession();
    const box = createSessionBox(session);

    attachToSession({ getSession: box.get, setSession: box.set, documentObj });

    documentObj.hide();
    documentObj.show();

    expect(box.current().status).toBe('playing');
    const evaluated = evaluateAnswer(box.current(), { isCorrect: true });
    expect(evaluated.accepted).toBe(true);
  });

  test('onResume is called with the resumed session so the screen can show the current state', () => {
    const documentObj = createFakeDocument();
    const session = startSession();
    const box = createSessionBox(session);
    const onResume = jest.fn();

    attachToSession({ getSession: box.get, setSession: box.set, documentObj, onResume });

    documentObj.hide();
    expect(onResume).not.toHaveBeenCalled();

    documentObj.show();
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onResume.mock.calls[0][0].status).toBe('playing');
    expect(onResume.mock.calls[0][0].roundIndex).toBe(box.current().roundIndex);
  });

  test('onPause is called with the paused session when the document is hidden', () => {
    const documentObj = createFakeDocument();
    const session = startSession();
    const box = createSessionBox(session);
    const onPause = jest.fn();

    attachToSession({ getSession: box.get, setSession: box.set, documentObj, onPause });

    documentObj.hide();

    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onPause.mock.calls[0][0].status).toBe('paused');
  });

  describe('registerTimer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('a registered timer never fires while the document is hidden', () => {
      const documentObj = createFakeDocument();
      const session = startSession();
      const box = createSessionBox(session);
      const callback = jest.fn();

      const service = attachToSession({ getSession: box.get, setSession: box.set, documentObj });
      service.registerTimer(callback, 5000);

      documentObj.hide();
      jest.advanceTimersByTime(10000);

      expect(callback).not.toHaveBeenCalled();
    });

    test('resuming continues the timer with exactly the remaining time, not from scratch', () => {
      const documentObj = createFakeDocument();
      const session = startSession();
      const box = createSessionBox(session);
      const callback = jest.fn();

      const service = attachToSession({ getSession: box.get, setSession: box.set, documentObj });
      service.registerTimer(callback, 5000);

      jest.advanceTimersByTime(3000); // 2000ms left when hidden
      documentObj.hide();
      jest.advanceTimersByTime(60000); // however long it stays hidden, never counted
      documentObj.show();

      jest.advanceTimersByTime(1999);
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('a timer already registered by a finished round never leaks into the next round', () => {
      const documentObj = createFakeDocument();
      const session = startSession();
      const box = createSessionBox(session);
      const callback = jest.fn();

      const service = attachToSession({ getSession: box.get, setSession: box.set, documentObj });
      service.registerTimer(callback, 5000);

      const evaluated = evaluateAnswer(box.get(), { isCorrect: true });
      box.set(evaluated.session);
      const advanced = advanceRound(box.get());
      box.set(advanced.session);

      documentObj.hide();
      documentObj.show();
      jest.advanceTimersByTime(10000);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('registerAudio', () => {
    test('pauses playing audio on hide and resumes it on show', () => {
      const documentObj = createFakeDocument();
      const session = startSession();
      const box = createSessionBox(session);
      const audio = createFakeAudio();

      const service = attachToSession({ getSession: box.get, setSession: box.set, documentObj });
      service.registerAudio(audio);

      documentObj.hide();
      expect(audio.paused).toBe(true);

      documentObj.show();
      expect(audio.paused).toBe(false);
      expect(audio.played).toBe(1);
    });

    test('audio that was already paused before hiding is never auto-played on resume', () => {
      const documentObj = createFakeDocument();
      const session = startSession();
      const box = createSessionBox(session);
      const audio = createFakeAudio();
      audio.paused = true;

      const service = attachToSession({ getSession: box.get, setSession: box.set, documentObj });
      service.registerAudio(audio);

      documentObj.hide();
      documentObj.show();

      expect(audio.played).toBe(0);
    });
  });

  test('off() detaches the visibilitychange listener and the round-lifecycle hooks', () => {
    const documentObj = createFakeDocument();
    const session = startSession();
    const box = createSessionBox(session);

    const service = attachToSession({ getSession: box.get, setSession: box.set, documentObj });
    expect(documentObj.listenerCount()).toBe(1);

    service.off();
    expect(documentObj.listenerCount()).toBe(0);

    documentObj.hide();
    expect(box.current().status).toBe('playing');
  });

  test('HOOK_EVENTS.ROUND_STARTED/GAME_OVER are the exact roundContract events this service listens for', () => {
    const documentObj = createFakeDocument();
    const session = startSession();
    const box = createSessionBox(session);
    const seenEvents = [];
    session.hooks.on(HOOK_EVENTS.ROUND_STARTED, (payload) => seenEvents.push(payload));

    attachToSession({ getSession: box.get, setSession: box.set, documentObj });

    const evaluated = evaluateAnswer(box.get(), { isCorrect: true });
    box.set(evaluated.session);
    advanceRound(box.get());

    expect(seenEvents.map((entry) => entry.roundIndex)).toEqual([1]);
  });

  test('throws when getSession/setSession are missing (defensive: never silently no-ops)', () => {
    expect(() => attachToSession({})).toThrow();
    expect(() => attachToSession({ getSession: () => null, setSession: () => {} })).toThrow();
  });
});
