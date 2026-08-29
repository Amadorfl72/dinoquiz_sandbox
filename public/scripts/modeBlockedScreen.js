'use strict';

/**
 * Blocked-mode screen (TRIOFSND-306, PRD "Todos los modos deben funcionar
 * completamente sin conexión ... bloqueo controlado y accesible con vuelta
 * al selector si falta un recurso").
 *
 * Several modes already render their own local, mode-specific "blocked"
 * panel when their own round generator signals it cannot build a round
 * (e.g. oidoJurasicoScreen.js's `renderBlockedState`, shadowGuessScreen.js's
 * own equivalent) -- this is the generic, mode-agnostic version of that same
 * shape: a full screen a caller can render for *any* mode id once it has
 * already decided, by whatever means (e.g.
 * src/services/modeResourceValidation.js finding a declared resource
 * missing from the Cache Storage precache), that the mode cannot be entered
 * right now.
 *
 * Like public/scripts/modeChangeConfirmScreen.js, this module only renders
 * and reports the "go back" action via `options.onBack` -- it never decides
 * *whether* a mode is blocked, never touches storage, and never logs
 * anything itself (the caller that made the blocking decision -- e.g.
 * modeResourceValidation.js's `logModeResourceMissing`, or LogService's own
 * `logModeBlocked` -- already owns that).
 *
 * All copy comes from the `modeBlocked` key in public/i18n/es.json
 * (`screenTitle`, `message`, `backButtonLabel`); `options.reasonText` lets a
 * caller substitute a more specific, already-localized reason (e.g. one of
 * `modeSelector.blockedReasons`) for the generic `message` without this
 * screen needing to know about cause codes itself.
 *
 * Accessibility: a real, focusable `<h1>` (not just visual text) receives
 * focus on mount so a screen reader announces the screen change, mirroring
 * modeSelectorScreen.js's own title-focus convention for a top-level
 * screen (as opposed to modeChangeConfirmScreen.js's dialog, which focuses
 * its safe/cancel button instead). The message is `role="status"`/
 * `aria-live="polite"` so it is announced even if a future caller re-renders
 * this screen with a different `reasonText` without a full remount. "Volver
 * al selector" is a real `<button>` meeting the >=48x48dp touch target, its
 * text is the same string as its accessible name -- never color/icon alone.
 *
 * Same dual CommonJS/browser-global pattern as
 * public/scripts/modeChangeConfirmScreen.js so it loads both under Jest
 * (`require`) and as a plain `<script>` with no bundler (see
 * public/index.html).
 */

(function () {
  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).modeBlocked;
    }
    return null;
  }

  function renderModeBlockedScreen(container, options) {
    options = options || {};
    var strings = options.strings || resolveDefaultStrings(options.locale);

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'mode-blocked-screen';

    var icon = document.createElement('span');
    icon.className = 'mode-blocked-screen__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🔒';

    var title = document.createElement('h1');
    title.id = 'mode-blocked-screen-title';
    title.className = 'mode-blocked-screen__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;

    var message = document.createElement('p');
    message.className = 'mode-blocked-screen__message';
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.textContent = options.reasonText || strings.message;

    var backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'mode-blocked-screen__back-button';
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
    renderModeBlockedScreen: renderModeBlockedScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderModeBlockedScreen = renderModeBlockedScreen;
    window.DinoQuiz.screens.modeBlocked = api;
  }
})();
