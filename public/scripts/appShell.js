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
 *
 * `installExternalLinkGuard` (TRIOFSND-121): none of the three screens in the
 * closed Inicio -> Quiz -> Resultados loop render an `<a>` today, but the PRD
 * requires the flow to stay a walled garden a 6-8 year-old can't tap their
 * way out of (no external links, no accidental purchases/ad redirects) even
 * if a future screen, i18n string or ad/banner integration introduces one by
 * mistake. Rather than trusting every screen to remember that rule, this
 * installs a single capturing click listener on the app-shell root (covers
 * `#app` and `#mute-toggle`, i.e. every current and future screen) that
 * blocks the default action of any click landing on an anchor whose `href`
 * resolves to a different origin or whose `target` is `_blank`, and
 * neutralizes `window.open` so script-driven popups can't leave the app
 * either. Internal navigation (the privacy policy's hash-based route,
 * TRIOFSND-116) is left untouched since it never uses `<a>` tags or
 * `window.open`.
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
    // Belt-and-braces alongside the `.app-shell__mute-toggle` rule in
    // main.css: inline styles guarantee the AC-2/AC-11 48x48dp touch target
    // even in contexts that don't load that stylesheet (e.g. jsdom's
    // getComputedStyle, which doesn't resolve external stylesheets).
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

  /**
   * True when `href` would navigate away from `baseHref`'s origin, or when
   * the anchor opens a new browsing context (`target="_blank"`) -- either
   * way, a tap would take the child out of the closed Inicio/Quiz/Resultados
   * loop. Same-origin/relative/hash hrefs (e.g. the privacy policy route)
   * resolve to `baseHref`'s own origin and are left alone. An `href` that
   * fails to parse as a URL (empty, `javascript:`, malformed) is treated as
   * non-external -- it can't leave the app's origin either.
   */
  function isExternalAnchor(anchor, baseHref) {
    if (!anchor || typeof anchor.getAttribute !== 'function') {
      return false;
    }

    if (anchor.getAttribute('target') === '_blank') {
      return true;
    }

    var href = anchor.getAttribute('href');
    if (!href) {
      return false;
    }

    try {
      var resolved = new URL(href, baseHref);
      var base = new URL(baseHref);
      return resolved.origin !== base.origin;
    } catch (error) {
      return false;
    }
  }

  /**
   * Installs a single capturing click listener on `root` (defaults to the
   * whole document, so it covers every current and future screen) that
   * cancels navigation for any external anchor (see `isExternalAnchor`), and
   * neutralizes `win.open` so script-driven popups can't leave the app.
   * Returns `{ destroy }` to remove the listener/restore `window.open`
   * (mainly for tests); returns `null` when there's no DOM to guard.
   */
  function installExternalLinkGuard(root, win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    root = root || (typeof document !== 'undefined' ? document : undefined);

    if (!root || typeof root.addEventListener !== 'function') {
      return null;
    }

    function handleClick(event) {
      var target = event.target;
      var anchor = target && typeof target.closest === 'function' ? target.closest('a') : null;
      if (!anchor) {
        return;
      }

      var baseHref = (win && win.location && win.location.href) || (root.baseURI || 'http://localhost/');
      if (isExternalAnchor(anchor, baseHref)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    root.addEventListener('click', handleClick, true);

    var originalOpen = win && win.open;
    if (win) {
      win.open = function () {
        return null;
      };
    }

    return {
      destroy: function () {
        root.removeEventListener('click', handleClick, true);
        if (win) {
          win.open = originalOpen;
        }
      },
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      MUTE_STORAGE_KEY: MUTE_STORAGE_KEY,
      renderMuteToggleButton: renderMuteToggleButton,
      readStoredMute: readStoredMute,
      writeStoredMute: writeStoredMute,
      isExternalAnchor: isExternalAnchor,
      installExternalLinkGuard: installExternalLinkGuard,
    };
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.appShell = window.DinoQuiz.appShell || {};
    window.DinoQuiz.appShell.renderMuteToggleButton = renderMuteToggleButton;
    window.DinoQuiz.appShell.isExternalAnchor = isExternalAnchor;
    window.DinoQuiz.appShell.installExternalLinkGuard = installExternalLinkGuard;
  }
})();
