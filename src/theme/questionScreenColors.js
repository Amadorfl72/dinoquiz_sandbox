'use strict';

/**
 * Color tokens for the Pregunta/Feedback screen answer states. Keep these in
 * sync with the `.question-screen__option` rules in public/styles/main.css —
 * this file exists so contrast.test.js can guard every state at WCAG AA
 * (PRD AC-13) without needing a real browser to render the stylesheet.
 */
const QUESTION_SCREEN_COLORS = Object.freeze({
  normal: Object.freeze({ background: '#FFFFFF', text: '#1B5E20' }),
  // Correct answer: green fill + thick border, always shown once answered.
  correct: Object.freeze({ background: '#2E7D32', text: '#FFFFFF' }),
  // Wrong pick: neutral (no red/negative color), just marks what was chosen.
  neutral: Object.freeze({ background: '#CFD8DC', text: '#263238' }),
});

/**
 * Unanswered-state option colors (TRIOFSND-72: "3-4 opciones de respuesta
 * grandes y de colores distintos"), applied in this order to the 3-4 option
 * buttons via `:nth-child` in public/styles/main.css. None of them is red,
 * so nothing here is ever confused with a negative/error signal (AC-7).
 */
const QUESTION_OPTION_PALETTE = Object.freeze([
  Object.freeze({ background: '#1565C0', text: '#FFFFFF' }), // blue
  Object.freeze({ background: '#6A1B9A', text: '#FFFFFF' }), // purple
  Object.freeze({ background: '#00695C', text: '#FFFFFF' }), // teal
  Object.freeze({ background: '#FBC02D', text: '#1B5E20' }), // amber
]);

module.exports = { QUESTION_SCREEN_COLORS, QUESTION_OPTION_PALETTE };
