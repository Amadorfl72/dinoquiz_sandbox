'use strict';

/**
 * Home ("Inicio") screen: title, the mascot illustration, the '¡Jugar!'
 * entry point and a discreet, optional notice for parents about local-only
 * progress. All copy comes from the i18n resource (public/i18n/es.json) —
 * no hardcoded strings here, per AC-15.
 *
 * This file follows the same dual CommonJS/browser-global pattern as
 * public/scripts/main.js so it can be loaded both directly by Jest (via
 * `require`, exercised in tests/pwa/home-screen.test.js) and as a plain
 * `<script>` in the browser (see public/index.html) with no bundler.
 * `renderHomeScreen` accepts pre-resolved `options.strings` so the browser
 * path never needs `require`; the Node-only default lookup below is a
 * convenience for callers (tests) that don't pass strings explicitly.
 *
 * The mascot is a small, hand-authored SVG precached with the app shell
 * (see public/service-worker.js) so it paints with the rest of the screen
 * on a cold, offline load instead of waiting on a separate runtime-cached
 * fetch — this is what keeps first render under the 2s budget.
 *
 * The notice uses `role="note"` (ancillary content, not part of the main
 * reading/interaction flow) so assistive tech can reach it without a child
 * needing to interact with it first — it is never focused programmatically
 * and never sits between the title and the play button in tab order.
 */

(function () {
  var MASCOT_IMAGE_SRC = '/assets/images/mascot.svg';
  var MASCOT_IMAGE_SIZE = 320;

  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).home;
    }
    return null;
  }

  function renderHomeScreen(container, options) {
    options = options || {};
    var strings = options.strings || resolveDefaultStrings(options.locale);

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'home-screen';

    var title = document.createElement('h1');
    title.className = 'home-screen__title';
    title.textContent = strings.title;

    var mascot = document.createElement('img');
    mascot.className = 'home-screen__mascot';
    mascot.src = MASCOT_IMAGE_SRC;
    mascot.alt = strings.mascotAlt;
    mascot.width = MASCOT_IMAGE_SIZE;
    mascot.height = MASCOT_IMAGE_SIZE;
    mascot.decoding = 'async';
    mascot.setAttribute('fetchpriority', 'high');

    var playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'home-screen__play-button';
    playButton.textContent = strings.playButton;

    var parentalNotice = document.createElement('p');
    parentalNotice.className = 'home-screen__parental-notice';
    parentalNotice.setAttribute('role', 'note');
    parentalNotice.setAttribute('aria-label', strings.parentalNotice.label);
    parentalNotice.textContent = strings.parentalNotice.message;

    root.appendChild(title);
    root.appendChild(mascot);
    root.appendChild(playButton);
    root.appendChild(parentalNotice);
    container.appendChild(root);

    return { root: root, title: title, mascot: mascot, playButton: playButton, parentalNotice: parentalNotice };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderHomeScreen: renderHomeScreen, MASCOT_IMAGE_SRC: MASCOT_IMAGE_SRC };
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderHomeScreen = renderHomeScreen;
    window.DinoQuiz.screens.MASCOT_IMAGE_SRC = MASCOT_IMAGE_SRC;
  }
})();
