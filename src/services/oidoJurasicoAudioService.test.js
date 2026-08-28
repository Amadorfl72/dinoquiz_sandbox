'use strict';

const { STATUS, MUTE_STORAGE_KEY, createOidoJurasicoAudioService } = require('./oidoJurasicoAudioService');

const SOUND_SRC = '/assets/sounds/oido-jurasico/trex.wav';

function buildAudioCtor(overrides = {}) {
  const instances = [];

  function FakeAudio(src) {
    this.src = src;
    this.paused = true;
    this.ended = false;
    this.playCount = 0;
    this._endedListeners = [];
    instances.push(this);
  }

  FakeAudio.prototype.play = overrides.play || jest.fn(function play() {
    this.paused = false;
    this.playCount += 1;
    return Promise.resolve();
  });

  FakeAudio.prototype.pause = overrides.pause || jest.fn(function pause() {
    this.paused = true;
  });

  FakeAudio.prototype.addEventListener = function addEventListener(event, handler) {
    if (event === 'ended') {
      this._endedListeners.push(handler);
    }
  };

  FakeAudio.prototype.emitEnded = function emitEnded() {
    this.ended = true;
    this._endedListeners.slice().forEach((handler) => handler());
  };

  return { FakeAudio, instances };
}

function buildStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = value;
    },
  };
}

function buildDocument(initialHidden = false) {
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

describe('oidoJurasicoAudioService (TRIOFSND-269)', () => {
  describe('mute gate', () => {
    test('play() is a no-op that never constructs Audio when dinoquiz:muted is "true"', () => {
      const { FakeAudio, instances } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'true' });
      const onMuted = jest.fn();
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, onMuted, autoListen: false });

      const state = service.play(SOUND_SRC);

      expect(instances).toHaveLength(0);
      expect(state.status).toBe(STATUS.MUTED);
      expect(onMuted).toHaveBeenCalledTimes(1);
    });

    test('play() checks the mute flag fresh on every call, never caching it from creation time', () => {
      const { FakeAudio, instances } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'true' });
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, autoListen: false });

      expect(service.play(SOUND_SRC).status).toBe(STATUS.MUTED);
      expect(instances).toHaveLength(0);

      // Unmuted mid-session (child toggled the global mute control): the
      // very next attempt must see it, with no need to recreate the service.
      storageObj.setItem(MUTE_STORAGE_KEY, 'false');

      const state = service.play(SOUND_SRC);
      expect(state.status).toBe(STATUS.PLAYING);
      expect(instances).toHaveLength(1);
    });

    test('service creation itself never plays anything, muted or not (no autoplay)', () => {
      const { FakeAudio, instances } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });

      createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, autoListen: false });

      expect(instances).toHaveLength(0);
    });
  });

  describe('manual repeat', () => {
    test('repeat() re-checks mute fresh and starts a brand-new Audio element, distinct from the first', () => {
      const { FakeAudio, instances } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, autoListen: false });

      service.play(SOUND_SRC);
      instances[0].emitEnded();
      expect(service.getState().status).toBe(STATUS.IDLE);

      const state = service.repeat(SOUND_SRC);

      expect(instances).toHaveLength(2);
      expect(instances[1]).not.toBe(instances[0]);
      expect(instances[1].playCount).toBe(1);
      expect(state.status).toBe(STATUS.PLAYING);
    });

    test('repeat() stops whatever was still playing before starting the new attempt', () => {
      const { FakeAudio, instances } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, autoListen: false });

      service.play(SOUND_SRC);
      expect(instances[0].paused).toBe(false);

      service.repeat(SOUND_SRC);

      expect(instances[0].pause).toHaveBeenCalledTimes(1);
    });

    test('repeat() is blocked by mute exactly like play(), never bypassing the gate', () => {
      const { FakeAudio, instances } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'true' });
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, autoListen: false });

      const state = service.repeat(SOUND_SRC);

      expect(instances).toHaveLength(0);
      expect(state.status).toBe(STATUS.MUTED);
    });
  });

  describe('playback error', () => {
    test('a synchronous throw from the Audio constructor signals STATUS.ERROR and calls onError', () => {
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const onError = jest.fn();
      function ThrowingAudio() {
        throw new Error('decode error');
      }
      const service = createOidoJurasicoAudioService({ AudioCtor: ThrowingAudio, storageObj, onError, autoListen: false });

      const state = service.play(SOUND_SRC);

      expect(state.status).toBe(STATUS.ERROR);
      expect(state.error).toBeInstanceOf(Error);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    test('a synchronous throw from play() signals STATUS.ERROR and calls onError', () => {
      const { FakeAudio } = buildAudioCtor({
        play: jest.fn(function play() {
          throw new Error('NotSupportedError');
        }),
      });
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const onError = jest.fn();
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, onError, autoListen: false });

      const state = service.play(SOUND_SRC);

      expect(state.status).toBe(STATUS.ERROR);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    test('a rejected play() promise (e.g. blocked/decode failure) signals STATUS.ERROR and calls onError', async () => {
      const { FakeAudio } = buildAudioCtor({
        play: jest.fn(function play() {
          this.paused = false;
          return Promise.reject(new Error('NotAllowedError'));
        }),
      });
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const onError = jest.fn();
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, onError, autoListen: false });

      const syncState = service.play(SOUND_SRC);
      expect(syncState.status).toBe(STATUS.PLAYING);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.getState().status).toBe(STATUS.ERROR);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    test('play() with no source signals STATUS.ERROR instead of silently doing nothing', () => {
      const { FakeAudio, instances } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, autoListen: false });

      const state = service.play();

      expect(state.status).toBe(STATUS.ERROR);
      expect(instances).toHaveLength(0);
    });
  });

  describe('pause by visibility', () => {
    test('hiding the document pauses in-progress playback and moves status to PAUSED', () => {
      const { FakeAudio, instances } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const documentObj = buildDocument();
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, documentObj });

      service.play(SOUND_SRC);
      expect(instances[0].paused).toBe(false);

      documentObj.hide();

      expect(instances[0].paused).toBe(true);
      expect(service.getState().status).toBe(STATUS.PAUSED);
    });

    test('becoming visible again never auto-resumes playback (explicit repeat is required)', () => {
      const { FakeAudio, instances } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const documentObj = buildDocument();
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, documentObj });

      service.play(SOUND_SRC);
      documentObj.hide();
      documentObj.show();

      expect(instances[0].playCount).toBe(1);
      expect(instances[0].paused).toBe(true);
      expect(service.getState().status).toBe(STATUS.PAUSED);
    });

    test('hiding the document while idle (nothing playing) is a harmless no-op', () => {
      const { FakeAudio } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const documentObj = buildDocument();
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, documentObj });

      documentObj.hide();

      expect(service.getState().status).toBe(STATUS.IDLE);
    });

    test('off() detaches the visibilitychange listener and stops current playback', () => {
      const { FakeAudio, instances } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const documentObj = buildDocument();
      const service = createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, documentObj });

      service.play(SOUND_SRC);
      expect(documentObj.listenerCount()).toBe(1);

      service.off();

      expect(documentObj.listenerCount()).toBe(0);
      expect(instances[0].paused).toBe(true);

      documentObj.hide();
      expect(instances[0].pause).toHaveBeenCalledTimes(1);
    });

    test('autoListen: false skips the visibilitychange subscription entirely', () => {
      const { FakeAudio } = buildAudioCtor();
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const documentObj = buildDocument();
      createOidoJurasicoAudioService({ AudioCtor: FakeAudio, storageObj, documentObj, autoListen: false });

      expect(documentObj.listenerCount()).toBe(0);
    });
  });

  describe('isMuted()', () => {
    test('reflects the storage flag fresh, independent of any play attempt', () => {
      const storageObj = buildStorage({ [MUTE_STORAGE_KEY]: 'false' });
      const service = createOidoJurasicoAudioService({ storageObj, autoListen: false });

      expect(service.isMuted()).toBe(false);
      storageObj.setItem(MUTE_STORAGE_KEY, 'true');
      expect(service.isMuted()).toBe(true);
    });
  });
});
