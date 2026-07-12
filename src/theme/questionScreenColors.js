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
  // Dato curioso box (TRIOFSND-83): yellow highlight per the mockup.
  funFact: Object.freeze({ background: '#FFF9C4', text: '#5D4037' }),
  // Rewarded-ad CTA (TRIOFSND-86): purple fill, distinct from the green
  // "Siguiente" button so the optional/ad nature of the CTA is visually
  // obvious, never confused with required game controls.
  rewardedAdCta: Object.freeze({ background: '#6A1B9A', text: '#FFFFFF' }),
  // Extra dato curioso box unlocked by the rewarded ad: blue highlight,
  // distinct from the free dato curioso's yellow box.
  extraFunFact: Object.freeze({ background: '#E3F2FD', text: '#0D47A1' }),
});

module.exports = { QUESTION_SCREEN_COLORS };
