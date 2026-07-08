'use strict';

/**
 * Color tokens for the two visual states of the global mute toggle (button
 * background + icon). Keep these in sync with the `.mute-toggle` rules in
 * public/styles/main.css -- contrast.test.js guards both states at WCAG AA
 * (PRD AC-13).
 */
const MUTE_TOGGLE_COLORS = Object.freeze({
  // Sound on (default): outlined, same palette as the rest of the app shell.
  unmuted: Object.freeze({ background: '#FFFFFF', icon: '#1B5E20' }),
  // Sound off: filled state so the "muted" state is visually unmistakable.
  muted: Object.freeze({ background: '#2E7D32', icon: '#FFFFFF' }),
});

module.exports = { MUTE_TOGGLE_COLORS };
