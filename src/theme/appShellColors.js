'use strict';

/**
 * Color tokens for global app-shell controls (currently the mute toggle).
 * Keep these in sync with the `.app-shell__mute-toggle` rules in
 * public/styles/main.css — this file exists so contrast.test.js can guard
 * every state at WCAG AA (PRD AC-13) without needing a real browser to
 * render the stylesheet.
 */
const MUTE_TOGGLE_COLORS = Object.freeze({
  unmuted: Object.freeze({ background: '#2E7D32', icon: '#FFFFFF' }),
  muted: Object.freeze({ background: '#616161', icon: '#FFFFFF' }),
});

module.exports = { MUTE_TOGGLE_COLORS };
