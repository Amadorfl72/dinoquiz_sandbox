'use strict';

const { SOUND_SOURCES, FAIL_SOUND_VOLUME, playSound, playFailSound } = require('./audio');

function buildAudioCtor(overrides = {}) {
  const instances = [];

  function FakeAudio(src) {
    this.src = src;
    this.volume = 1;
    this.played = false;
    instances.push(this);
  }

  FakeAudio.prototype.play = overrides.play || jest.fn(function play() {
    this.played = true;
    return Promise.resolve();
  });

  return { FakeAudio, instances };
}

describe('playSound', () => {
  test('does nothing and returns null when muted', () => {
    const { FakeAudio, instances } = buildAudioCtor();

    const result = playSound('fail', { muted: true, AudioCtor: FakeAudio });

    expect(result).toBeNull();
    expect(instances).toHaveLength(0);
  });

  test('creates and plays the effect for the given name when not muted', () => {
    const { FakeAudio, instances } = buildAudioCtor();

    const result = playSound('fail', { muted: false, AudioCtor: FakeAudio });

    expect(instances).toHaveLength(1);
    expect(instances[0].src).toBe(SOUND_SOURCES.fail);
    expect(instances[0].played).toBe(true);
    expect(result).toBe(instances[0]);
  });

  test('returns null for an unknown sound name', () => {
    const { FakeAudio, instances } = buildAudioCtor();

    const result = playSound('does-not-exist', { AudioCtor: FakeAudio });

    expect(result).toBeNull();
    expect(instances).toHaveLength(0);
  });

  test('returns null when no Audio constructor is available (e.g. old/embedded browsers)', () => {
    const originalAudio = global.Audio;
    delete global.Audio;

    try {
      const result = playSound('fail', {});
      expect(result).toBeNull();
    } finally {
      global.Audio = originalAudio;
    }
  });

  test('swallows a rejected play() promise instead of throwing (autoplay blocked)', async () => {
    const { FakeAudio } = buildAudioCtor({
      play: jest.fn(function play() {
        return Promise.reject(new Error('NotAllowedError'));
      }),
    });

    expect(() => playSound('fail', { AudioCtor: FakeAudio })).not.toThrow();
    // Let the rejected promise's `.catch` microtask flush; an unhandled
    // rejection here would fail the test run.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  test('swallows a synchronous throw from the Audio constructor or play()', () => {
    function ThrowingAudio() {
      throw new Error('decode error');
    }

    expect(() => playSound('fail', { AudioCtor: ThrowingAudio })).not.toThrow();
    expect(playSound('fail', { AudioCtor: ThrowingAudio })).toBeNull();
  });

  test('applies the given volume to the created Audio element', () => {
    const { FakeAudio, instances } = buildAudioCtor();

    playSound('fail', { AudioCtor: FakeAudio, volume: 0.3 });

    expect(instances[0].volume).toBe(0.3);
  });
});

describe('playFailSound', () => {
  test('plays the neutral fail effect at its default volume when not muted', () => {
    const { FakeAudio, instances } = buildAudioCtor();

    playFailSound({ AudioCtor: FakeAudio });

    expect(instances).toHaveLength(1);
    expect(instances[0].src).toBe(SOUND_SOURCES.fail);
    expect(instances[0].volume).toBe(FAIL_SOUND_VOLUME);
  });

  test('stays silent when muted (modo silencio, AC-11/TRIOFSND-66)', () => {
    const { FakeAudio, instances } = buildAudioCtor();

    const result = playFailSound({ muted: true, AudioCtor: FakeAudio });

    expect(result).toBeNull();
    expect(instances).toHaveLength(0);
  });
});
