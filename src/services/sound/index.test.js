'use strict';

const { createSoundService, SOUND_SRC, MUTE_STORAGE_KEY } = require('./index');

function createFakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}

function createFakeAudio() {
  return {
    src: '',
    preload: '',
    currentTime: 0,
    played: 0,
    play() {
      this.played += 1;
      return Promise.resolve();
    },
  };
}

function createFakeAudioFactory() {
  const created = {};
  const factory = (src) => {
    const audio = createFakeAudio();
    audio.src = src;
    created[src] = audio;
    return audio;
  };
  factory.created = created;
  return factory;
}

describe('SoundService (TRIOFSND-78)', () => {
  it('exposes a correct and an incorrect sound source', () => {
    expect(SOUND_SRC.correct).toEqual(expect.stringContaining('correct'));
    expect(SOUND_SRC.incorrect).toEqual(expect.stringContaining('incorrect'));
  });

  describe('normal (unmuted) mode', () => {
    it('plays the positive sound on a correct answer', () => {
      const audioFactory = createFakeAudioFactory();
      const storageObj = createFakeStorage();
      const soundService = createSoundService({ audioFactory, storageObj });

      const played = soundService.playCorrect();

      expect(played).toBe(true);
      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(1);
    });

    it('plays the neutral sound on an incorrect answer', () => {
      const audioFactory = createFakeAudioFactory();
      const storageObj = createFakeStorage();
      const soundService = createSoundService({ audioFactory, storageObj });

      const played = soundService.playIncorrect();

      expect(played).toBe(true);
      expect(audioFactory.created[SOUND_SRC.incorrect].played).toBe(1);
    });

    it('preload() creates both effects up front with preload="auto", before any answer', () => {
      const audioFactory = createFakeAudioFactory();
      const storageObj = createFakeStorage();
      const soundService = createSoundService({ audioFactory, storageObj });

      soundService.preload();

      expect(audioFactory.created[SOUND_SRC.correct]).toBeDefined();
      expect(audioFactory.created[SOUND_SRC.incorrect]).toBeDefined();
      expect(audioFactory.created[SOUND_SRC.correct].preload).toBe('auto');
      expect(audioFactory.created[SOUND_SRC.incorrect].preload).toBe('auto');
      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(0);
    });

    it('reuses the preloaded Audio element instead of constructing a new one on play', () => {
      const audioFactory = createFakeAudioFactory();
      const factorySpy = jest.fn(audioFactory);
      const storageObj = createFakeStorage();
      const soundService = createSoundService({ audioFactory: factorySpy, storageObj });

      soundService.preload();
      soundService.playCorrect();

      expect(factorySpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('muted mode (AC-11: mute must be respected before any effect plays)', () => {
    it('reads the persisted `dinoquiz:muted` localStorage key and skips the correct sound', () => {
      const audioFactory = createFakeAudioFactory();
      const storageObj = createFakeStorage({ [MUTE_STORAGE_KEY]: 'true' });
      const soundService = createSoundService({ audioFactory, storageObj });

      const played = soundService.playCorrect();

      expect(played).toBe(false);
      expect(soundService.isMuted()).toBe(true);
      expect(audioFactory.created[SOUND_SRC.correct]).toBeUndefined();
    });

    it('skips the incorrect sound too', () => {
      const audioFactory = createFakeAudioFactory();
      const storageObj = createFakeStorage({ [MUTE_STORAGE_KEY]: 'true' });
      const soundService = createSoundService({ audioFactory, storageObj });

      const played = soundService.playIncorrect();

      expect(played).toBe(false);
      expect(audioFactory.created[SOUND_SRC.incorrect]).toBeUndefined();
    });

    it('still shows no effect even if the sound was already preloaded before muting', () => {
      const audioFactory = createFakeAudioFactory();
      const storageObj = createFakeStorage();
      const soundService = createSoundService({ audioFactory, storageObj });

      soundService.preload();
      storageObj.setItem(MUTE_STORAGE_KEY, 'true');
      const played = soundService.playCorrect();

      expect(played).toBe(false);
      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(0);
    });

    it('resumes playing as soon as the mute flag is cleared, without re-reading anything else', () => {
      const audioFactory = createFakeAudioFactory();
      const storageObj = createFakeStorage({ [MUTE_STORAGE_KEY]: 'true' });
      const soundService = createSoundService({ audioFactory, storageObj });

      expect(soundService.playCorrect()).toBe(false);

      storageObj.setItem(MUTE_STORAGE_KEY, 'false');
      expect(soundService.playCorrect()).toBe(true);
      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(1);
    });
  });

  describe('degraded environments', () => {
    it('never throws when no storage backend is available (defaults to unmuted)', () => {
      const audioFactory = createFakeAudioFactory();
      const soundService = createSoundService({ audioFactory, storageObj: undefined });

      expect(() => soundService.playCorrect()).not.toThrow();
    });

    it('returns false instead of throwing when the audio factory yields nothing (e.g. no Audio API)', () => {
      const storageObj = createFakeStorage();
      const soundService = createSoundService({ audioFactory: () => null, storageObj });

      expect(soundService.playCorrect()).toBe(false);
    });
  });
});
