'use strict';

/**
 * Color tokens for the Home screen. Keep these in sync with the
 * `.home-screen__tooltip` rule in public/styles/main.css — this file exists
 * so contrast.test.js can guard it at WCAG AA (PRD AC-13) without needing a
 * real browser to render the stylesheet.
 */
const HOME_SCREEN_COLORS = Object.freeze({
  tooltip: Object.freeze({ background: '#FBC02D', text: '#1B5E20' }),
});

module.exports = { HOME_SCREEN_COLORS };
