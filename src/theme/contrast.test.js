'use strict';

const { contrastRatio, meetsWcagAA } = require('./contrast');
const { QUESTION_SCREEN_COLORS } = require('./questionScreenColors');
const { GLOBAL_CONTROLS_COLORS } = require('./globalControlsColors');
const { HOME_SCREEN_COLORS } = require('./homeScreenColors');
const { MUTE_TOGGLE_COLORS } = require('./appShellColors');

describe('contrastRatio', () => {
  test('is 21 for black on white (the maximum possible ratio)', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  test('is 1 for identical colors (no contrast at all)', () => {
    expect(contrastRatio('#2E7D32', '#2E7D32')).toBeCloseTo(1, 5);
  });

  test('is symmetric regardless of argument order', () => {
    expect(contrastRatio('#1B5E20', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#1B5E20'), 5);
  });
});

describe('meetsWcagAA', () => {
  test('passes normal text at exactly the 4.5:1 threshold', () => {
    expect(meetsWcagAA(4.5)).toBe(true);
    expect(meetsWcagAA(4.49)).toBe(false);
  });

  test('large text has a lower 3:1 threshold', () => {
    expect(meetsWcagAA(3, { largeText: true })).toBe(true);
    expect(meetsWcagAA(3, { largeText: false })).toBe(false);
  });
});

describe('question screen color tokens (PRD AC-13: WCAG AA in every answer state)', () => {
  test('the normal (unanswered) state meets AA', () => {
    const { background, text } = QUESTION_SCREEN_COLORS.normal;
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(4.5);
  });

  test('the correct-answer state (green fill) meets AA', () => {
    const { background, text } = QUESTION_SCREEN_COLORS.correct;
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(4.5);
  });

  test('the neutral incorrect-pick state meets AA', () => {
    const { background, text } = QUESTION_SCREEN_COLORS.neutral;
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(4.5);
  });

  test('the dato curioso yellow box meets AA', () => {
    const { background, text } = QUESTION_SCREEN_COLORS.funFact;
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(4.5);
  });

  test('the rewarded-ad CTA button meets AA (TRIOFSND-86)', () => {
    const { background, text } = QUESTION_SCREEN_COLORS.rewardedAdCta;
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(4.5);
  });

  test('the extra dato curioso blue box unlocked by the rewarded ad meets AA (TRIOFSND-86)', () => {
    const { background, text } = QUESTION_SCREEN_COLORS.extraFunFact;
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('global controls color tokens (PRD AC-13: WCAG AA for mute/privacy/purchase controls)', () => {
  test('the icon button state meets AA', () => {
    const { background, text } = GLOBAL_CONTROLS_COLORS.iconButton;
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(4.5);
  });

  test('the disclosure panel state meets AA', () => {
    const { background, text } = GLOBAL_CONTROLS_COLORS.panel;
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('home screen color tokens (PRD AC-13: WCAG AA)', () => {
  test('the first-run tooltip (TRIOFSND-65) meets AA', () => {
    const { background, text } = HOME_SCREEN_COLORS.tooltip;
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('privacy policy screen color tokens (PRD AC-13, TRIOFSND-116)', () => {
  test('the home privacy icon (green text on white) meets AA', () => {
    expect(contrastRatio('#1b5e20', '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  test('the "Volver" back button (white text on green fill) meets AA', () => {
    expect(contrastRatio('#ffffff', '#2e7d32')).toBeGreaterThanOrEqual(4.5);
  });

  test('the screen body text (green on the app cream background) meets AA', () => {
    expect(contrastRatio('#1b5e20', '#fff8e1')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('mute toggle color tokens (PRD AC-2/AC-13/AC-14: WCAG AA in every mute state)', () => {
  test('the unmuted state meets AA', () => {
    const { background, icon } = MUTE_TOGGLE_COLORS.unmuted;
    expect(contrastRatio(background, icon)).toBeGreaterThanOrEqual(4.5);
  });

  test('the muted state meets AA', () => {
    const { background, icon } = MUTE_TOGGLE_COLORS.muted;
    expect(contrastRatio(background, icon)).toBeGreaterThanOrEqual(4.5);
  });
});
