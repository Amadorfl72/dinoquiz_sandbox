'use strict';

/**
 * Color tokens for the Pregunta/Feedback screen answer states. Keep these in
 * sync with the `.question-screen__option` rules in public/styles/main.css —
 * this file exists so contrast.test.js can guard every state at WCAG AA
 * (PRD AC-13) without needing a real browser to render the stylesheet.
 *
 * Values come from the shared `COLORS` tokens (see designTokens.js) so the
 * question screen never drifts out of sync with the buttons on other
 * screens.
 */
const { COLORS } = require('./designTokens');

const QUESTION_SCREEN_COLORS = Object.freeze({
  normal: Object.freeze({ background: COLORS.optionBackground, text: COLORS.text }),
  // Correct answer: green fill + thick border, always shown once answered.
  correct: Object.freeze({ background: COLORS.primary, text: COLORS.white }),
  // Wrong pick: neutral (no red/negative color), just marks what was chosen.
  neutral: Object.freeze({ background: COLORS.neutralBackground, text: COLORS.neutralText }),
});

module.exports = { QUESTION_SCREEN_COLORS };
