'use strict';

/**
 * Feedback sound effects (TRIOFSND-78).
 *
 * Plays a short positive chime on a correct answer and a soft neutral tone
 * on an incorrect one, synchronized with the visual feedback in
 * questionScreen.js (<300ms, AC-5): `play()` is fully synchronous (no
 * `await`, no promise chaining before `audio.play()` is invoked), and
 * `preload()` eagerly constructs both `Audio` elements right after the
 * question mounts (mirrors `warmUpFeedbackAnimation`) so the first tap never
 * pays a first-run allocation/decode cost.
 *
 * Mute (AC-11): before every `play()` this reads the same namespaced
 * `dinoquiz:muted` localStorage key `src/services/storage` persists (see
 * `MUTE_STORAGE_KEY` in main.js for the identical browser-side reader) —
 * synchronously and freshly each time, never cached from `preload()` — so a
 * mid-game mute toggle takes effect on the very next answer. When muted, the
 * audio is skipped entirely (no `Audio.play()` call) while the visual
 * feedback in questionScreen.js still runs unchanged.
 *
 * Browser bridge: DinoQuiz has no bundler, so this file follows the same
 * dual CommonJS/global pattern as scoring.js/homeScreen.js — it registers on
 * `window.DinoQuiz.services.soundService` for the `<script>`-loaded PWA and
 * also `module.exports`s for Node/Jest. The canonical `src/services/sound`
 * module re-exports this file.
 */

(function () {
  var MUTE_STORAGE_KEY = 'dinoquiz:muted';

  var SOUND_SRC = {
    correct: '/assets/sounds/correct.wav',
    incorrect: '/assets/sounds/incorrect.wav',
  };

  function isMuted(storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return false;
    }

    try {
      // Strict string equality per AC: only the exact value "true" means
      // muted. Any other value ("false", "1", "", or an absent key) allows
      // playback. Read fresh on every call so a mid-game toggle takes effect
      // on the next answer without rebuilding the service.
      return storageObj.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  function defaultAudioFactory(src) {
    return typeof Audio !== 'undefined' ? new Audio(src) : null;
  }

  function createSoundService(options) {
    options = options || {};
    var audioFactory = options.audioFactory || defaultAudioFactory;
    var storageObj = options.storageObj;
    var players = {};

    function getPlayer(key) {
      if (!players[key]) {
        var audio = audioFactory(SOUND_SRC[key]);
        if (audio) {
          audio.preload = 'auto';
          players[key] = audio;
        }
      }
      return players[key] || null;
    }

    /** Eagerly creates both Audio elements so the first play() has zero setup cost. */
    function preload() {
      Object.keys(SOUND_SRC).forEach(function (key) {
        getPlayer(key);
      });
    }

    function play(key) {
      if (isMuted(storageObj)) {
        return false;
      }

      var audio = getPlayer(key);
      if (!audio) {
        return false;
      }

      try {
        audio.currentTime = 0;
      } catch (error) {
        // Resetting currentTime before metadata has loaded throws in some
        // engines; playing from wherever it left off is fine for a <1s sfx.
      }

      // Double protection (AC — tolerance to audio errors): `Audio.play()`
      // can fail in TWO independent ways and NEITHER may propagate to the
      // answer handler or block the visual feedback:
      //   1. It can throw SYNCHRONOUSLY, before returning anything (invalid
      //      media element, some autoplay-policy engines, a test double whose
      //      `play` throws) — the surrounding try/catch swallows that.
      //   2. It can return a promise that REJECTS asynchronously (autoplay
      //      blocked before the first gesture) — the `.catch()` swallows that.
      try {
        var playResult = audio.play();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(function () {
            // Async rejection (e.g. autoplay restrictions); this call is
            // itself the result of a tap, so this only guards edge cases and
            // never blocks the visual feedback.
          });
        }
      } catch (error) {
        // Synchronous throw from audio.play(); swallow it so the visual
        // feedback, scoring and correct-answer indication keep running.
        return false;
      }

      return true;
    }

    return {
      preload: preload,
      isMuted: function () {
        return isMuted(storageObj);
      },
      playCorrect: function () {
        return play('correct');
      },
      playIncorrect: function () {
        return play('incorrect');
      },
    };
  }

  var soundService = createSoundService();

  var api = {
    SOUND_SRC: SOUND_SRC,
    MUTE_STORAGE_KEY: MUTE_STORAGE_KEY,
    createSoundService: createSoundService,
    soundService: soundService,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.soundService = soundService;
    window.DinoQuiz.services.createSoundService = createSoundService;
  }
})();
