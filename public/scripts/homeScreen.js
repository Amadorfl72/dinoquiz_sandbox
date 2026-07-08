'use strict';

/**
 * Home ("Inicio") screen: title, the mascot illustration, the '¡Jugar!'
 * entry point, a discreet optional notice for parents about local-only
 * progress, and the global controls row (mute, privacy policy, remove-ads
 * purchase). All copy comes from the i18n resource (public/i18n/es.json) —
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
 * Global controls (TRIOFSND-66): the mute toggle, privacy policy access and
 * remove-ads purchase entry live in this same file rather than as separate
 * `src/screens/*Screen.js` files. They aren't a distinct navigable "pantalla"
 * in the Inicio → Quiz → Resultados flow -- privacy/purchase are disclosure
 * panels opened from Inicio (satisfying the "≤2 taps" requirement trivially,
 * since opening them is a single tap), and the mute toggle has no view at
 * all. Each control is a real `<button>` (native keyboard/focus support) at
 * least 48x48dp (see `.home-screen__icon-button` in main.css) with an
 * `aria-label` naming it and, for the two disclosures, `aria-expanded` +
 * `aria-controls` wiring their panel per the WAI-ARIA disclosure pattern.
 * Mute additionally exposes `aria-pressed` as a toggle button. Persisting
 * the mute preference is left to the caller via `options.onToggleMute` (see
 * public/scripts/main.js) so this file stays a pure, DOM-only, unit-testable
 * component -- consistent with how `onAnswer`/`onNext`/`onPlayAgain` are
 * handled in the other screens.
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

  var MUTE_ICON = '🔊';
  var UNMUTE_ICON = '🔇';
  var PRIVACY_ICON = '🔒';
  var PURCHASE_ICON = '🛍️';

  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).home;
    }
    return null;
  }

  function resolveDefaultLocaleStrings(locale, section) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE)[section];
    }
    return null;
  }

  function buildDisclosurePanel(id, headingText, closeButtonLabel) {
    var panel = document.createElement('div');
    panel.id = id;
    panel.className = 'home-screen__panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', headingText);
    panel.hidden = true;

    var heading = document.createElement('h2');
    heading.className = 'home-screen__panel-heading';
    heading.textContent = headingText;
    panel.appendChild(heading);

    var body = document.createElement('div');
    body.className = 'home-screen__panel-body';
    panel.appendChild(body);

    var closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'home-screen__panel-close-button';
    closeButton.textContent = closeButtonLabel;
    panel.appendChild(closeButton);

    return { panel: panel, body: body, closeButton: closeButton };
  }

  function buildIconButton(className, iconGlyph, ariaLabel) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'home-screen__icon-button ' + className;

    var icon = document.createElement('span');
    icon.className = 'home-screen__icon-button-glyph';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = iconGlyph;
    button.appendChild(icon);
    button.setAttribute('aria-label', ariaLabel);

    return { button: button, icon: icon };
  }

  function wireDisclosure(button, panel, closeButton) {
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', panel.id);

    function setOpen(open) {
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    }

    button.addEventListener('click', function () {
      setOpen(panel.hidden);
      if (!panel.hidden) {
        closeButton.focus();
      }
    });

    closeButton.addEventListener('click', function () {
      setOpen(false);
      button.focus();
    });

    panel.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setOpen(false);
        button.focus();
      }
    });
  }

  function appendParagraphs(body, texts) {
    texts.forEach(function (text) {
      var paragraph = document.createElement('p');
      paragraph.textContent = text;
      body.appendChild(paragraph);
    });
  }

  function buildPrivacyPanel(strings) {
    var built = buildDisclosurePanel('home-screen-privacy-panel', strings.heading, strings.closeButton);

    appendParagraphs(built.body, [strings.intro]);
    strings.sections.forEach(function (section) {
      var sectionHeading = document.createElement('h3');
      sectionHeading.textContent = section.heading;
      built.body.appendChild(sectionHeading);

      var sectionBody = document.createElement('p');
      sectionBody.textContent = section.body;
      built.body.appendChild(sectionBody);
    });

    return built;
  }

  function buildPurchasePanel(strings, onPurchase) {
    var built = buildDisclosurePanel('home-screen-purchase-panel', strings.heading, strings.closeButton);

    appendParagraphs(built.body, [strings.description]);

    var priceEl = document.createElement('p');
    priceEl.className = 'home-screen__panel-price';
    priceEl.textContent = strings.priceLabel;
    built.body.appendChild(priceEl);

    var purchaseButton = document.createElement('button');
    purchaseButton.type = 'button';
    purchaseButton.className = 'home-screen__purchase-confirm-button';
    purchaseButton.textContent = strings.purchaseButton;
    if (typeof onPurchase === 'function') {
      purchaseButton.addEventListener('click', onPurchase);
    }
    built.body.appendChild(purchaseButton);

    built.purchaseButton = purchaseButton;
    return built;
  }

  function renderHomeScreen(container, options) {
    options = options || {};
    var strings = options.strings || resolveDefaultStrings(options.locale);
    var privacyStrings = options.privacyStrings || resolveDefaultLocaleStrings(options.locale, 'privacy');
    var purchaseStrings = options.purchaseStrings || resolveDefaultLocaleStrings(options.locale, 'purchase');
    var controlsStrings = strings.globalControls;

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

    // -- Global controls: mute toggle, privacy policy, remove-ads purchase --
    var globalControls = document.createElement('div');
    globalControls.className = 'home-screen__global-controls';
    globalControls.setAttribute('role', 'group');
    globalControls.setAttribute('aria-label', controlsStrings.groupLabel);

    var muted = !!options.muted;
    var built = buildIconButton(
      'home-screen__mute-button',
      muted ? UNMUTE_ICON : MUTE_ICON,
      muted ? controlsStrings.muteButton.unmuteLabel : controlsStrings.muteButton.muteLabel
    );
    var muteButton = built.button;
    var muteIcon = built.icon;
    muteButton.setAttribute('aria-pressed', String(muted));

    function updateMuteButton() {
      muteIcon.textContent = muted ? UNMUTE_ICON : MUTE_ICON;
      muteButton.setAttribute('aria-pressed', String(muted));
      muteButton.setAttribute(
        'aria-label',
        muted ? controlsStrings.muteButton.unmuteLabel : controlsStrings.muteButton.muteLabel
      );
    }

    muteButton.addEventListener('click', function () {
      muted = !muted;
      updateMuteButton();
      if (typeof options.onToggleMute === 'function') {
        options.onToggleMute(muted);
      }
    });

    var privacyBuilt = buildIconButton('home-screen__privacy-button', PRIVACY_ICON, controlsStrings.privacyButton);
    var privacyButton = privacyBuilt.button;
    var privacyPanelBuilt = buildPrivacyPanel(privacyStrings);
    wireDisclosure(privacyButton, privacyPanelBuilt.panel, privacyPanelBuilt.closeButton);

    var purchaseBuilt = buildIconButton('home-screen__purchase-button', PURCHASE_ICON, controlsStrings.purchaseButton);
    var purchaseButton = purchaseBuilt.button;
    var purchasePanelBuilt = buildPurchasePanel(purchaseStrings, options.onPurchase);
    wireDisclosure(purchaseButton, purchasePanelBuilt.panel, purchasePanelBuilt.closeButton);

    globalControls.appendChild(muteButton);
    globalControls.appendChild(privacyButton);
    globalControls.appendChild(purchaseButton);
    root.appendChild(title);
    root.appendChild(mascot);
    root.appendChild(playButton);
    if (tooltip) {
      root.appendChild(tooltip);
    }
    root.appendChild(privacyPolicyButton);
    root.appendChild(globalControls);
    root.appendChild(parentalNotice);
    root.appendChild(privacyPanelBuilt.panel);
    root.appendChild(purchasePanelBuilt.panel);
    container.appendChild(root);

    return {
      root: root,
      title: title,
      mascot: mascot,
      playButton: playButton,
      privacyPolicyButton: privacyPolicyButton,
      parentalNotice: parentalNotice,
      tooltip: tooltip,
      globalControls: globalControls,
      muteButton: muteButton,
      privacyButton: privacyButton,
      privacyPanel: privacyPanelBuilt.panel,
      purchaseButton: purchaseButton,
      purchasePanel: purchasePanelBuilt.panel,
      purchaseConfirmButton: purchasePanelBuilt.purchaseButton,
      isMuted: function () {
        return muted;
      },
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
