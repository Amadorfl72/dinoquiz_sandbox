'use strict';

/**
 * Age gate ("selección de edad") screen (TRIOFSND-193, exact-age capture
 * TRIOFSND-204).
 *
 * Shown right after the '¡Jugar!' tap and before the game is prepared (see
 * public/scripts/main.js), so the app can tell apart two age bands -- 7 years
 * or younger, and 8-or-more -- without ever asking for a birthdate or any
 * other identifying detail. Two large, clearly labeled buttons, each a real
 * `<button>` for native keyboard/focus support and >=48x48dp touch targets
 * (PRD AC-2), grouped under `role="group"` so assistive tech announces them
 * as a single choice.
 *
 * Privacy by design (PRD G7): the selection is kept in a plain in-memory
 * module variable (`selectedAgeBand` below) for the running session only --
 * never written to localStorage/IndexedDB, never logged, never sent over the
 * network and never handed to the analytics/storage services (contrast with
 * e.g. the mute or ads-removed flags in main.js, which *are* persisted).
 * Reloading the page or starting a new session loses it, by design. Content
 * doesn't yet vary by age (DinoQuiz ships a single set of
 * illustrations/questions), so `SAFE_DEFAULT_AGE_BAND` documents the safe
 * fallback the PRD calls for when the age can't be determined (e.g. the
 * screen is skipped or dismissed without a tap): keep using the current,
 * already kid-appropriate content as-is rather than guessing.
 *
 * Same dual CommonJS/browser-global pattern as public/scripts/homeScreen.js
 * so it loads both under Jest (`require`) and as a plain `<script>` with no
 * bundler (see public/index.html).
 *
 * Accessibility: the heading receives focus on mount so screen readers
 * announce the new view immediately after the tap that opened it, matching
 * public/scripts/privacyPolicyScreen.js.
 */

(function () {
  var AGE_BANDS = {
    SEVEN: 'seven',
    EIGHT_PLUS: 'eight-plus',
  };

  // Only one set of illustrations/questions exists today, so "safe" simply
  // means "don't change anything" -- the eight-plus age carries no restriction.
  var SAFE_DEFAULT_AGE_BAND = AGE_BANDS.EIGHT_PLUS;

  var SEVEN_ICON = '🦕';
  var EIGHT_PLUS_ICON = '🦖';

  // In-memory/session only (see module doc comment above) -- intentionally
  // not backed by localStorage/IndexedDB/any storage service.
  var selectedAgeBand = null;

  function getSelectedAgeBand() {
    return selectedAgeBand;
  }

  function isKnownAgeBand(ageBand) {
    return ageBand === AGE_BANDS.SEVEN || ageBand === AGE_BANDS.EIGHT_PLUS;
  }

  function setSelectedAgeBand(ageBand) {
    selectedAgeBand = isKnownAgeBand(ageBand) ? ageBand : null;
    return selectedAgeBand;
  }

  function resetSelectedAgeBand() {
    selectedAgeBand = null;
  }

  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).ageGate;
    }
    return null;
  }

  function buildOptionButton(className, iconGlyph, label, ageBand, onSelect) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'age-gate-screen__option ' + className;
    button.setAttribute('aria-label', label);

    var icon = document.createElement('span');
    icon.className = 'age-gate-screen__option-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = iconGlyph;

    var labelEl = document.createElement('span');
    labelEl.className = 'age-gate-screen__option-label';
    labelEl.textContent = label;

    button.appendChild(icon);
    button.appendChild(labelEl);

    button.addEventListener('click', function () {
      setSelectedAgeBand(ageBand);
      if (typeof onSelect === 'function') {
        onSelect(ageBand);
      }
    });

    return button;
  }

  function renderAgeGateScreen(container, options) {
    options = options || {};
    var strings = options.strings || resolveDefaultStrings(options.locale);

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'age-gate-screen';

    var title = document.createElement('h1');
    title.id = 'age-gate-screen-title';
    title.className = 'age-gate-screen__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;

    var instructions = document.createElement('p');
    instructions.className = 'age-gate-screen__instructions';
    instructions.textContent = strings.instructions;

    var optionsGroup = document.createElement('div');
    optionsGroup.className = 'age-gate-screen__options';
    optionsGroup.setAttribute('role', 'group');
    optionsGroup.setAttribute('aria-labelledby', title.id);

    var sevenButton = buildOptionButton(
      'age-gate-screen__option--seven',
      SEVEN_ICON,
      strings.sevenOption,
      AGE_BANDS.SEVEN,
      options.onSelect
    );
    var eightPlusButton = buildOptionButton(
      'age-gate-screen__option--eight-plus',
      EIGHT_PLUS_ICON,
      strings.eightPlusOption,
      AGE_BANDS.EIGHT_PLUS,
      options.onSelect
    );

    optionsGroup.appendChild(sevenButton);
    optionsGroup.appendChild(eightPlusButton);

    root.appendChild(title);
    root.appendChild(instructions);
    root.appendChild(optionsGroup);
    container.appendChild(root);

    if (typeof title.focus === 'function') {
      title.focus();
    }

    return {
      root: root,
      title: title,
      instructions: instructions,
      optionsGroup: optionsGroup,
      sevenButton: sevenButton,
      eightPlusButton: eightPlusButton,
    };
  }

  var api = {
    AGE_BANDS: AGE_BANDS,
    SAFE_DEFAULT_AGE_BAND: SAFE_DEFAULT_AGE_BAND,
    getSelectedAgeBand: getSelectedAgeBand,
    setSelectedAgeBand: setSelectedAgeBand,
    resetSelectedAgeBand: resetSelectedAgeBand,
    renderAgeGateScreen: renderAgeGateScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderAgeGateScreen = renderAgeGateScreen;
    window.DinoQuiz.screens.ageGate = api;
  }
})();
