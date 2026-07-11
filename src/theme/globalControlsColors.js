'use strict';

/**
 * Color tokens for the Home screen's global controls (mute, privacy,
 * purchase icon buttons) and their disclosure panels. Kept in sync with the
 * `.home-screen__icon-button` / `.home-screen__panel` rules in
 * public/styles/main.css — this file lets contrast.test.js guard them at
 * WCAG AA (PRD AC-13) without needing a real browser to render the
 * stylesheet.
 */
const GLOBAL_CONTROLS_COLORS = Object.freeze({
  iconButton: Object.freeze({ background: '#FFFFFF', text: '#1B5E20' }),
  panel: Object.freeze({ background: '#FFFFFF', text: '#1B5E20' }),
});

module.exports = { GLOBAL_CONTROLS_COLORS };
