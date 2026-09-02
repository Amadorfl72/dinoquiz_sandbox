'use strict';

/**
 * Mode-dispatch fallback warning screen (TRIOFSND-322, PRD "bloqueo
 * controlado y accesible con vuelta al selector").
 *
 * public/scripts/main.js's `handleModeSelected`/`startMode` dispatches every
 * tapped mode id through an explicit mode->renderer registry built from
 * `resolveScreenRenderers()`. When the selected id has no entry in that
 * registry -- a mode id the catalog doesn't know, or whose own renderer
 * failed to load -- this screen renders instead of silently starting the
 * Quiz orchestrator (the exact "silent quiz" regression
 * tests/pwa/mode-dispatch-catalog.test.js already guards against for every
 * catalog id). It never decides *whether* a mode is dispatchable, never
 * touches storage, and never logs anything itself -- the caller that made
 * that decision already recorded the local `mode_dispatch_mismatch` event
 * via src/services/analytics.js before rendering this.
 *
 * Distinct from modeBlockedScreen.js: that one covers a mode the selector
 * already knows is unavailable (missing content/creature coverage); this
 * one covers a mode the *dispatcher* itself cannot route to a working
 * engine at all, whatever the reason. Same shape and copy pattern
 * regardless -- a `<h1>` that receives focus on mount so a screen reader
 * announces the change, an `role="status"`/`aria-live="polite"` message (no
 * information conveyed by color/icon alone) and a real, >=48x48dp `<button>`
 * whose visible text is its own accessible name, wired to `options.onBack`
 * to return to the mode selector.
 *
 * All copy comes from the `modeFallbackWarning` key in public/i18n/es.json
 * (`screenTitle`, `message`, `backButtonLabel`). Same dual CommonJS/browser-
 * global pattern as public/scripts/modeBlockedScreen.js so it loads both
 * under Jest (`require`) and as a plain `<script>` with no bundler (see
 * public/index.html).
 */

(function () {
  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).modeFallbackWarning;
    }
    return null;
  }

  function renderModeFallbackWarningScreen(container, options) {
    options = options || {};
    var strings = options.strings || resolveDefaultStrings(options.locale);

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'mode-fallback-warning-screen';

    var icon = document.createElement('span');
    icon.className = 'mode-fallback-warning-screen__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⚠️';

    var title = document.createElement('h1');
    title.id = 'mode-fallback-warning-screen-title';
    title.className = 'mode-fallback-warning-screen__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;

    var message = document.createElement('p');
    message.className = 'mode-fallback-warning-screen__message';
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.textContent = strings.message;

    var backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'mode-fallback-warning-screen__back-button';
    backButton.textContent = strings.backButtonLabel;
    backButton.setAttribute('aria-label', strings.backButtonLabel);
    backButton.addEventListener('click', function () {
      if (typeof options.onBack === 'function') {
        options.onBack();
      }
    });

    root.appendChild(icon);
    root.appendChild(title);
    root.appendChild(message);
    root.appendChild(backButton);
    container.appendChild(root);

    if (typeof title.focus === 'function') {
      title.focus();
    }

    return {
      root: root,
      title: title,
      message: message,
      backButton: backButton,
    };
  }

  var api = {
    renderModeFallbackWarningScreen: renderModeFallbackWarningScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderModeFallbackWarningScreen = renderModeFallbackWarningScreen;
    window.DinoQuiz.screens.modeFallbackWarning = api;
  }
})();
