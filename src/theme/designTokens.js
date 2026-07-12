'use strict';

/**
 * Shared design tokens (colors, font sizes, touch target size) reused across
 * every screen (Inicio, Pregunta/Feedback, Resultados) so accessibility
 * limits — WCAG AA contrast (PRD AC-13), >=18-20sp text, >=48x48dp touch
 * targets (PRD AC-2) — live in one place instead of being hand-copied
 * per screen, which is what let past regressions (e.g. a hover state that
 * dropped below 4.5:1) go unnoticed.
 *
 * Mirror any value change here in the `:root` custom properties of
 * public/styles/main.css — there is no build step to share this module with
 * the browser, so designTokens.test.js exists to guard the two from
 * drifting apart silently.
 */

const FONT_SIZES = Object.freeze({
  // Absolute floor for any UI text (e.g. the home screen's fine-print notice).
  min: 18,
  // Standard reading text: question prompt, feedback, fun fact, score.
  body: 20,
  // Small headings within a screen (fun fact heading).
  headingSmall: 24,
  // Answer option / secondary button labels.
  button: 20,
  // Primary call-to-action labels (Jugar!, Volver a jugar, Siguiente).
  buttonLarge: 24,
});

// PRD AC-2: every interactive control needs a >=48x48dp tap area.
const TAP_TARGET_MIN = 48;

const COLORS = Object.freeze({
  background: '#FFF8E1',
  text: '#1B5E20',
  white: '#FFFFFF',

  // Primary action buttons (Jugar!, Siguiente, Volver a jugar). Hover/pressed
  // are darker shades of the same hue so contrast against white text only
  // improves as the state escalates, instead of the old hover color
  // (#388E3C), which lightened the fill and dropped below 4.5:1.
  primary: '#2E7D32',
  primaryHover: '#236627',
  primaryPressed: '#1A541E',

  // "Correct answer" fill in the question screen reuses `primary` so the
  // feedback state and the primary buttons never drift out of sync.
  neutralBackground: '#CFD8DC',
  neutralText: '#263238',

  // Answer options before/while being interacted with (white fill + green
  // text/border). Hover/pressed use light green tints that stay far above
  // the AA floor against the green text.
  optionBackground: '#FFFFFF',
  optionBackgroundHover: '#E8F5E9',
  optionBackgroundPressed: '#C8E6C9',

  // Focus ring color depends on what it sits against: gold reads clearly on
  // the dark green buttons, but fails contrast on white/cream backgrounds
  // (1.6:1) — those use a dark blue ring instead.
  focusRingOnDark: '#FBC02D',
  focusRingOnLight: '#0D47A1',

  // Results screen stars. The original gold (#F9A825) was only 1.85:1
  // against the cream background; this shade clears both the 3:1 large-text
  // floor and the stricter 4.5:1 normal-text one, for margin.
  stars: '#9C6500',
});

module.exports = { FONT_SIZES, TAP_TARGET_MIN, COLORS };
