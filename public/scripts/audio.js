'use strict';

/**
 * Sound effects (TRIOFSND-89).
 *
 * A single, tiny playback helper the screens call into instead of touching
 * `Audio`/`window.DinoQuiz.audio` directly, so every effect goes through the
 * same mute gate. Per AC-7 ("un fallo nunca penaliza ni usa lenguaje
 * negativo"), the wrong-answer effect (`fail`) is a soft, neutral descending
 * tone — not a buzzer/error sound — so a miss still feels calm. `playSound`
 * is muted-aware: when `options.muted` is true it's a no-op, so "modo
 * silencio" (TRIOFSND-66's global mute preference, `dinoquiz:muted`) silences
 * every effect without each screen having to check the flag itself; the
 * failure is still communicated purely visually via question-screen's
 * existing feedback styling.
 *
 * Autoplay/jsdom safety: `HTMLAudioElement.play()` can reject (browser
 * autoplay policies) or, under jsdom in tests, log a "not implemented"
 * warning instead of actually playing. Either way this never throws or
 * blocks the caller — a missing/failed sound must never stop the feedback
 * flow reaching the fun fact and "Siguiente" button.
 *
 * Browser bridge: DinoQuiz ships without a bundler, so this follows the same
 * dual CommonJS/global pattern as public/scripts/scoring.js — registers on
 * `window.DinoQuiz.audio` for the `<script>`-loaded PWA and `module.exports`
 * for Node/Jest. The canonical `src/services/audio.js` re-exports this file.
 */

(function () {
  var SOUND_SOURCES = {
    fail: '/assets/sounds/fail-neutral.wav',
  };

  var FAIL_SOUND_VOLUME = 0.5;

  /** Plays the named effect unless muted; returns the Audio element, or null if it couldn't be started. */
  function playSound(name, options) {
    options = options || {};

    if (options.muted) {
      return null;
    }

    var src = SOUND_SOURCES[name];
    if (!src) {
      return null;
    }

    var AudioCtor = options.AudioCtor || (typeof Audio !== 'undefined' ? Audio : null);
    if (typeof AudioCtor !== 'function') {
      return null;
    }

    try {
      var audio = new AudioCtor(src);
      audio.volume = typeof options.volume === 'number' ? options.volume : 1;

      var playResult = audio.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(function () {
          // Autoplay was blocked or the asset failed to decode: the miss is
          // still shown visually, so silently drop the sound.
        });
      }

      return audio;
    } catch (error) {
      return null;
    }
  }

  /** Soft, neutral tone for a wrong answer (AC-7: never a harsh/error sound). */
  function playFailSound(options) {
    options = options || {};
    var mergedOptions = { muted: options.muted, AudioCtor: options.AudioCtor };
    mergedOptions.volume = typeof options.volume === 'number' ? options.volume : FAIL_SOUND_VOLUME;
    return playSound('fail', mergedOptions);
  }

  var api = {
    SOUND_SOURCES: SOUND_SOURCES,
    FAIL_SOUND_VOLUME: FAIL_SOUND_VOLUME,
    playSound: playSound,
    playFailSound: playFailSound,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.audio = api;
  }
})();
