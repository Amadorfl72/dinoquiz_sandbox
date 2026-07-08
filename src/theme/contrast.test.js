'use strict';

const { contrastRatio, meetsWcagAA } = require('./contrast');
const { QUESTION_SCREEN_COLORS } = require('./questionScreenColors');

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
});
