'use strict';

/**
 * DinoQuiz app shell: global controls shared by every screen (Inicio, Quiz,
 * Feedback, Resultados). v1 ships a single control, the mute toggle
 * (TRIOFSND-105, AC-11).
 *
 * `renderMuteToggleButton` mounts into `#mute-toggle` (see public/index.html),
 * a container that lives *outside* `#app`. Screens replace `#app`'s content
 * wholesale on every render (see public/scripts/homeScreen.js and
 * src/screens/*.js, `container.innerHTML = ''`), so mounting the button
 * anywhere inside `#app` would make it disappear on every screen transition.
 * Living in its own sibling container is what makes it a true app-shell
 * control instead of a per-screen duplication.
 *
 * This file follows the same dual CommonJS/browser-global pattern as
 * public/scripts/homeScreen.js so it can be loaded both directly by Jest
 * (via `require`) and as a plain `<script>` in the browser with no bundler.
 */
(function () {
  var MUTE_STORAGE_KEY = 'dinoquiz.audio.muted';

  var SPEAKER_ON_ICON =
    '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4z" />' +
    '<path fill="currentColor" d="M16.5 12c0-1.77-.77-3.29-2-4.24v8.48c1.23-.95 2-2.47 2-4.24zM14.5 3.23v2.06c2.89 1.02 5 3.76 5 7.01s-2.11 5.99-5 7.01v2.06c4.01-1.06 7-4.62 7-9.07s-2.99-8.01-7-9.07z" />' +
    '</svg>';

  var SPEAKER_OFF_ICON =
    '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4z" />' +
    '<path fill="currentColor" d="M19.5 12l2.5-2.5-1.41-1.41L18.09 10.6 15.6 8.09 14.19 9.5 16.68 12l-2.49 2.49 1.41 1.41L18.09 13.4l2.5 2.5 1.41-1.41L19.5 12z" />' +
    '</svg>';

  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).muteButton;
    }
    return null;
  }

  function readStoredMute(storage) {
    try {
      return storage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  function writeStoredMute(isMuted, storage) {
    try {
      storage.setItem(MUTE_STORAGE_KEY, String(isMuted));
    } catch (error) {
      // Storage unavailable (e.g. private browsing); mute state stays in-memory only.
    }
  }

  function renderMuteToggleButton(container, options) {
    options = options || {};
    var strings = options.strings || resolveDefaultStrings(options.locale);
    var storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : undefined);

    container.innerHTML = '';

    var isMuted = storage ? readStoredMute(storage) : false;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'app-shell__mute-toggle';
    // Inline min-width/min-height mirror public/styles/main.css so the
    // ≥48x48dp touch target (AC-2/AC-23) holds even where the stylesheet
    // isn't loaded (e.g. unit tests rendering into a bare container).
    button.style.minWidth = '48px';
    button.style.minHeight = '48px';

    function applyState() {
      button.setAttribute('aria-pressed', String(isMuted));
      button.setAttribute('aria-label', isMuted ? strings.unmuteLabel : strings.muteLabel);
      button.classList.toggle('app-shell__mute-toggle--muted', isMuted);
      button.classList.toggle('app-shell__mute-toggle--unmuted', !isMuted);
      button.innerHTML = isMuted ? SPEAKER_OFF_ICON : SPEAKER_ON_ICON;
    }

    button.addEventListener('click', function () {
      isMuted = !isMuted;
      if (storage) {
        writeStoredMute(isMuted, storage);
      }
      applyState();
      if (typeof options.onToggle === 'function') {
        options.onToggle(isMuted);
      }
    });

    applyState();
    container.appendChild(button);

    return { root: button, isMuted: function () { return isMuted; } };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      MUTE_STORAGE_KEY: MUTE_STORAGE_KEY,
      renderMuteToggleButton: renderMuteToggleButton,
      readStoredMute: readStoredMute,
      writeStoredMute: writeStoredMute,
    };
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.appShell = window.DinoQuiz.appShell || {};
    window.DinoQuiz.appShell.renderMuteToggleButton = renderMuteToggleButton;
  }
})();
