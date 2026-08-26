'use strict';

/**
 * Network status (TRIOFSND-112).
 *
 * A single place to ask "is there a connection right now?" before letting the
 * player reach a resource that actually needs one (currently: the remove-ads
 * in-app purchase, see public/scripts/homeScreen.js's purchase panel). Every
 * other resource in DinoQuiz is precached for 100% offline play, so this is
 * intentionally the *only* gate in the app.
 *
 * `isOnline` fails open (returns true) when `navigator.onLine` isn't
 * available at all, e.g. very old browsers -- per the PRD this must never
 * block the rest of the app, so an unknown signal is treated as "assume
 * connected" rather than as a reason to show a reconnect message.
 *
 * Browser bridge: DinoQuiz ships without a bundler, so this follows the same
 * dual CommonJS/global pattern as public/scripts/audio.js -- registers on
 * `window.DinoQuiz.services.network` for the `<script>`-loaded PWA and
 * `module.exports` for Node/Jest. The canonical `src/services/network.js`
 * re-exports this file.
 */

(function () {
  function isOnline(nav) {
    nav = nav || (typeof navigator !== 'undefined' ? navigator : undefined);

    if (!nav || typeof nav.onLine !== 'boolean') {
      return true;
    }

    return nav.onLine;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isOnline: isOnline };
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.network = { isOnline: isOnline };
  }
})();
