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
  // Dato curioso box (TRIOFSND-83): yellow highlight per the mockup.
  funFact: Object.freeze({ background: '#FFF9C4', text: '#5D4037' }),
});

module.exports = { QUESTION_SCREEN_COLORS };
