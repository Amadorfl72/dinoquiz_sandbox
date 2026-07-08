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
 *
 * `options.showTooltip` optionally renders a first-run animated tooltip
 * pointing at the '¡Jugar!' button (TRIOFSND-65). This screen has no
 * knowledge of *why* it should or shouldn't show it — the caller (the
 * bootstrap in public/scripts/main.js) resolves the persisted "already
 * seen" flag and passes the boolean in, the same way it resolves the i18n
 * strings before calling here. The tooltip disappears on the first tap
 * anywhere on screen or on the play button itself via `options.onTooltipDismiss`,
 * which the caller uses to persist the "seen" flag so it never reappears.
 * `options.onPlayButtonClick` fires on every play button tap; the caller
 * uses it to record the aggregated, non-PII `first_tap_jugar` local counter.
 *
 * The privacy policy icon button (TRIOFSND-116) opens the privacy policy
 * view (public/scripts/privacyPolicyScreen.js) in a single tap — it is a
 * plain button with a descriptive `aria-label`/`title` from the i18n
 * resource (no icon-only, unlabeled control), reachable from Home in <2 taps.
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

    var privacyPolicyButton = document.createElement('button');
    privacyPolicyButton.type = 'button';
    privacyPolicyButton.className = 'home-screen__privacy-button';
    privacyPolicyButton.setAttribute('aria-label', strings.privacyPolicyIconLabel);
    privacyPolicyButton.title = strings.privacyPolicyIconHint;
    var privacyPolicyIcon = document.createElement('span');
    privacyPolicyIcon.setAttribute('aria-hidden', 'true');
    privacyPolicyIcon.textContent = '🔒';
    var privacyPolicyLabel = document.createElement('span');
    privacyPolicyLabel.className = 'home-screen__privacy-button-label';
    privacyPolicyLabel.textContent = strings.privacyPolicyIconLabel;
    privacyPolicyButton.appendChild(privacyPolicyIcon);
    privacyPolicyButton.appendChild(privacyPolicyLabel);
    if (typeof options.onOpenPrivacyPolicy === 'function') {
      privacyPolicyButton.addEventListener('click', options.onOpenPrivacyPolicy);
    }

    var parentalNotice = document.createElement('p');
    parentalNotice.className = 'home-screen__parental-notice';
    parentalNotice.setAttribute('role', 'note');
    parentalNotice.setAttribute('aria-label', strings.parentalNotice.label);
    parentalNotice.textContent = strings.parentalNotice.message;

    var tooltip = null;
    var tooltipDismissed = false;
    // Dismissal listens on the document, not just `.home-screen`: the
    // acceptance criterion is "hides after the first tap anywhere on the
    // screen", and `.home-screen` is a centered, max-width root that leaves
    // empty/padding area around it (inside #app and beyond) a tap there
    // must still dismiss the tooltip.
    var dismissScope = (container && container.ownerDocument) || document;

    function dismissTooltip() {
      if (tooltipDismissed) return;
      tooltipDismissed = true;

      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
      playButton.removeAttribute('aria-describedby');
      dismissScope.removeEventListener('click', dismissTooltip);

      if (typeof options.onTooltipDismiss === 'function') {
        options.onTooltipDismiss();
      }
    }

    if (options.showTooltip) {
      tooltip = document.createElement('p');
      tooltip.id = 'home-screen-tooltip';
      tooltip.className = 'home-screen__tooltip home-screen__tooltip--animated';
      tooltip.setAttribute('role', 'status');
      tooltip.textContent = strings.tooltip.message;
      playButton.setAttribute('aria-describedby', tooltip.id);
      dismissScope.addEventListener('click', dismissTooltip);
    }

    playButton.addEventListener('click', function () {
      dismissTooltip();
      if (typeof options.onPlayButtonClick === 'function') {
        options.onPlayButtonClick();
      }
    });

    root.appendChild(title);
    root.appendChild(mascot);
    root.appendChild(playButton);
    if (tooltip) {
      root.appendChild(tooltip);
    }
    root.appendChild(privacyPolicyButton);
    root.appendChild(parentalNotice);
    container.appendChild(root);

    return {
      root: root,
      title: title,
      mascot: mascot,
      playButton: playButton,
      privacyPolicyButton: privacyPolicyButton,
      parentalNotice: parentalNotice,
      tooltip: tooltip,
    };
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
