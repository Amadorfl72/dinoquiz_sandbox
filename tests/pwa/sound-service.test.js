'use strict';

/**
 * Feedback sound effects tests (TRIOFSND-78).
 *
 * Acceptance: "Tests cubriendo reproduccion en modo normal y silenciado."
 * These live under tests/pwa/ (matched by jest's `tests/**` testMatch) and
 * `require` the real browser module public/scripts/soundService.js, the same
 * pattern as tests/pwa/home-screen.test.js. A copy placed next to the source
 * under public/scripts/ would NOT run: jest.config.js only matches src/** and
 * tests/**, never public/**.
 *
 * The two required cases:
 *   - normal (mute NOT persisted): playCorrect/playIncorrect call Audio.play()
 *   - muted (`dinoquiz:muted` persisted as `true` in localStorage): no
 *     Audio.play() call at all, while the caller still shows visual feedback.
 */

var soundModule = require('../../public/scripts/soundService');
var createSoundService = soundModule.createSoundService;
var MUTE_STORAGE_KEY = soundModule.MUTE_STORAGE_KEY;

// Records every constructed player and its play() invocations so the tests can
// assert whether audio actually played without touching jsdom's unimplemented
// HTMLMediaElement.play().
function createRecordingAudioFactory() {
  var players = [];
  function factory(src) {
    var player = {
      src: src,
      preload: 'none',
      currentTime: 0,
      playCalls: 0,
      play: function () {
        player.playCalls += 1;
        return undefined;
      },
    };
    players.push(player);
    return player;
  }
  factory.players = players;
  factory.totalPlayCalls = function () {
    return players.reduce(function (sum, player) {
      return sum + player.playCalls;
    }, 0);
  };
  return factory;
}

describe('soundService feedback playback', function () {
  beforeEach(function () {
    window.localStorage.clear();
  });

  describe('normal mode (mute not persisted)', function () {
    it('plays the positive chime on a correct answer', function () {
      var audioFactory = createRecordingAudioFactory();
      var service = createSoundService({ audioFactory: audioFactory });

      var played = service.playCorrect();

      expect(service.isMuted()).toBe(false);
      expect(played).toBe(true);
      expect(audioFactory.totalPlayCalls()).toBe(1);
    });

    it('plays the soft neutral tone on an incorrect answer', function () {
      var audioFactory = createRecordingAudioFactory();
      var service = createSoundService({ audioFactory: audioFactory });

      var played = service.playIncorrect();

      expect(played).toBe(true);
      expect(audioFactory.totalPlayCalls()).toBe(1);
    });

    it('treats an explicitly false persisted flag as unmuted', function () {
      window.localStorage.setItem(MUTE_STORAGE_KEY, JSON.stringify(false));
      var audioFactory = createRecordingAudioFactory();
      var service = createSoundService({ audioFactory: audioFactory });

      expect(service.isMuted()).toBe(false);
      expect(service.playCorrect()).toBe(true);
      expect(audioFactory.totalPlayCalls()).toBe(1);
    });
  });

  describe('muted mode (dinoquiz:muted persisted as true)', function () {
    it('skips the positive chime entirely when muted', function () {
      window.localStorage.setItem(MUTE_STORAGE_KEY, JSON.stringify(true));
      var audioFactory = createRecordingAudioFactory();
      var service = createSoundService({ audioFactory: audioFactory });

      var played = service.playCorrect();

      expect(service.isMuted()).toBe(true);
      expect(played).toBe(false);
      expect(audioFactory.totalPlayCalls()).toBe(0);
    });

    it('skips the neutral tone entirely when muted', function () {
      window.localStorage.setItem(MUTE_STORAGE_KEY, JSON.stringify(true));
      var audioFactory = createRecordingAudioFactory();
      var service = createSoundService({ audioFactory: audioFactory });

      var played = service.playIncorrect();

      expect(played).toBe(false);
      expect(audioFactory.totalPlayCalls()).toBe(0);
    });
  });

  describe('mute state is read freshly on every play (mid-game toggle)', function () {
    it('starts playing again as soon as mute is turned off', function () {
      window.localStorage.setItem(MUTE_STORAGE_KEY, JSON.stringify(true));
      var audioFactory = createRecordingAudioFactory();
      var service = createSoundService({ audioFactory: audioFactory });

      expect(service.playCorrect()).toBe(false);
      expect(audioFactory.totalPlayCalls()).toBe(0);

      // The child taps the mute toggle off mid-game; the persisted flag flips.
      window.localStorage.setItem(MUTE_STORAGE_KEY, JSON.stringify(false));

      expect(service.playCorrect()).toBe(true);
      expect(audioFactory.totalPlayCalls()).toBe(1);
    });

    it('stops playing as soon as mute is turned on', function () {
      var audioFactory = createRecordingAudioFactory();
      var service = createSoundService({ audioFactory: audioFactory });

      expect(service.playIncorrect()).toBe(true);
      expect(audioFactory.totalPlayCalls()).toBe(1);

      window.localStorage.setItem(MUTE_STORAGE_KEY, JSON.stringify(true));

      expect(service.playIncorrect()).toBe(false);
      expect(audioFactory.totalPlayCalls()).toBe(1);
    });
  });

  describe('preload', function () {
    it('constructs both feedback players up front so the first tap has no setup cost', function () {
      var audioFactory = createRecordingAudioFactory();
      var service = createSoundService({ audioFactory: audioFactory });

      service.preload();

      expect(audioFactory.players.length).toBe(2);
      var sources = audioFactory.players.map(function (player) {
        return player.src;
      });
      expect(sources).toContain(soundModule.SOUND_SRC.correct);
      expect(sources).toContain(soundModule.SOUND_SRC.incorrect);
    });
  });
});
