'use strict';

/**
 * Oído Jurásico audio playback service (TRIOFSND-269).
 *
 * The whole mode hinges on the child actually hearing the round's
 * "imagined" creature sound, so this service is deliberately stricter than
 * the fire-and-forget sfx helpers (audio.js/soundService.js):
 *
 * - Mute (PRD: "todo audio debe respetar dinoquiz:muted antes de cualquier
 *   reproducción"): `isMuted` re-reads the namespaced `dinoquiz:muted`
 *   localStorage key FRESH inside every single `play()`/`repeat()` call --
 *   never cached from when the service was created or from a previous
 *   attempt -- so a mute toggle mid-round is respected on the very next tap.
 * - Never autoplay: nothing in this module starts playback on its own.
 *   `play()`/`repeat()` only ever run as the direct result of a caller
 *   (a button tap) invoking them explicitly.
 * - Errors are NOT swallowed like audio.js/soundService.js's sfx (a missing
 *   chime is harmless; a missing round sound breaks the mode). Any failure
 *   -- a throwing `Audio` constructor, a synchronous `play()` throw or an
 *   async rejected `play()` promise -- flips `getState().status` to
 *   `STATUS.ERROR` (with `.error` set) and invokes `options.onError`, so the
 *   mode screen can show the `oidoJurasico.playbackError` message and block
 *   the round instead of leaving the child stuck on a silent, dead button.
 * - Pause-by-visibility WITHOUT auto-resume: the moment the tab is hidden
 *   while a sound is playing, that sound is paused and `status` becomes
 *   `STATUS.PAUSED`. Unlike visibilityPauseService.js's generic
 *   `registerAudio` (which resumes automatically when the tab comes back),
 *   becoming visible again here does nothing -- resuming playback is itself
 *   a "play" action, so it stays behind the same explicit tap as everything
 *   else in this service.
 *
 * Browser bridge: no bundler, so this follows the same dual CommonJS/global
 * pattern as public/scripts/soundService.js -- registers on
 * `window.DinoQuiz.services.oidoJurasicoAudioService` for the
 * `<script>`-loaded PWA and `module.exports` for Node/Jest. The canonical
 * `src/services/oidoJurasicoAudioService.js` re-exports this file.
 */

(function () {
  var MUTE_STORAGE_KEY = 'dinoquiz:muted';

  var STATUS = Object.freeze({
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    MUTED: 'muted',
    ERROR: 'error',
  });

  function isDocumentHidden(docObj) {
    if (!docObj) {
      return false;
    }
    if (typeof docObj.hidden === 'boolean') {
      return docObj.hidden;
    }
    return docObj.visibilityState === 'hidden';
  }

  /** Reads `dinoquiz:muted` fresh -- never call this once and cache the result. */
  function isMuted(storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return false;
    }

    try {
      return storageObj.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Creates a service instance for a single Oído Jurásico session/round.
   * `options.AudioCtor` overrides the `Audio` constructor (tests);
   * `options.storageObj` overrides the mute flag's storage (defaults to
   * `localStorage`); `options.documentObj` overrides which `document`-like
   * object to watch for visibility (defaults to the global `document`);
   * `options.autoListen: false` skips the `visibilitychange` subscription,
   * leaving pause-on-hide fully caller-driven; `options.onMuted`/`onError`
   * are called, if given, on every muted/failed attempt in addition to
   * `getState()` reflecting it.
   */
  function createOidoJurasicoAudioService(options) {
    options = options || {};
    var storageObj = options.storageObj;
    var AudioCtor = options.AudioCtor || (typeof Audio !== 'undefined' ? Audio : null);
    var docObj = options.documentObj || (typeof document !== 'undefined' ? document : null);
    var onMuted = options.onMuted;
    var onError = options.onError;

    var currentAudio = null;
    var state = { status: STATUS.IDLE, error: null };
    var listening = false;

    function setState(next) {
      state = next;
    }

    function stopCurrent() {
      if (currentAudio) {
        try {
          currentAudio.pause();
        } catch (error) {
          // A stale/broken element failing to pause must never block the next attempt.
        }
      }
      currentAudio = null;
    }

    function fail(error) {
      setState({ status: STATUS.ERROR, error: error });
      if (typeof onError === 'function') {
        onError(error);
      }
    }

    /**
     * Shared by `play()`/`repeat()`: both are explicit, caller-triggered
     * attempts that (1) drop whatever was playing before, (2) re-check mute
     * fresh, then (3) build a brand-new `Audio` element for `src` -- never
     * resuming a previous, possibly-ended one.
     */
    function attempt(src) {
      stopCurrent();

      if (isMuted(storageObj)) {
        setState({ status: STATUS.MUTED, error: null });
        if (typeof onMuted === 'function') {
          onMuted();
        }
        return state;
      }

      if (typeof src !== 'string' || !src || typeof AudioCtor !== 'function') {
        fail(new Error('Oído Jurásico: no audio source/player available'));
        return state;
      }

      var audio;
      try {
        audio = new AudioCtor(src);
      } catch (error) {
        fail(error);
        return state;
      }

      if (typeof audio.addEventListener === 'function') {
        audio.addEventListener('ended', function () {
          if (currentAudio === audio) {
            currentAudio = null;
            setState({ status: STATUS.IDLE, error: null });
          }
        });
      }

      currentAudio = audio;

      try {
        var playResult = audio.play();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(function (error) {
            if (currentAudio === audio) {
              currentAudio = null;
            }
            fail(error);
          });
        }
      } catch (error) {
        currentAudio = null;
        fail(error);
        return state;
      }

      setState({ status: STATUS.PLAYING, error: null });
      return state;
    }

    /** Starts the round's sound. Only ever call this in response to a "Reproducir sonido" tap. */
    function play(src) {
      return attempt(src);
    }

    /** Replays the round's sound from the start. Only ever call this in response to an "Escuchar de nuevo" tap. */
    function repeat(src) {
      return attempt(src);
    }

    /** Pauses whatever is currently playing, if anything, without clearing it (used by hide + exposed for callers). */
    function pause() {
      if (currentAudio && state.status === STATUS.PLAYING) {
        try {
          currentAudio.pause();
        } catch (error) {
          // Nothing more to do either way; state below still reflects paused.
        }
        setState({ status: STATUS.PAUSED, error: null });
      }
    }

    function handleVisibilityChange() {
      if (isDocumentHidden(docObj)) {
        pause();
      }
      // Deliberately no `else` branch: becoming visible again never resumes
      // playback on its own -- the child must tap play/repeat again.
    }

    function startListening() {
      if (listening || !docObj || typeof docObj.addEventListener !== 'function') {
        return;
      }
      docObj.addEventListener('visibilitychange', handleVisibilityChange);
      listening = true;
    }

    /** Detaches the `visibilitychange` listener and stops any current playback; safe to call more than once. */
    function off() {
      stopCurrent();
      if (!listening || !docObj || typeof docObj.removeEventListener !== 'function') {
        return;
      }
      docObj.removeEventListener('visibilitychange', handleVisibilityChange);
      listening = false;
    }

    function getState() {
      return state;
    }

    if (options.autoListen !== false) {
      startListening();
    }

    return {
      play: play,
      repeat: repeat,
      pause: pause,
      getState: getState,
      isMuted: function () {
        return isMuted(storageObj);
      },
      off: off,
    };
  }

  var api = {
    STATUS: STATUS,
    MUTE_STORAGE_KEY: MUTE_STORAGE_KEY,
    createOidoJurasicoAudioService: createOidoJurasicoAudioService,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.oidoJurasicoAudioService = api;
  }
})();
