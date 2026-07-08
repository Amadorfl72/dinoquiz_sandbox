'use strict';

const { contrastRatio, meetsWcagAA, WCAG_AA_LARGE_TEXT } = require('./contrast');
const { FONT_SIZES, TAP_TARGET_MIN, COLORS } = require('./designTokens');

describe('design tokens: typography and touch targets (PRD AC-2, AC-4)', () => {
  test('no font size token is below the 18sp floor', () => {
    Object.values(FONT_SIZES).forEach((size) => {
      expect(size).toBeGreaterThanOrEqual(18);
    });
  });

  test('reading-content sizes (body, buttons, headings) are at least 20sp', () => {
    expect(FONT_SIZES.body).toBeGreaterThanOrEqual(20);
    expect(FONT_SIZES.button).toBeGreaterThanOrEqual(20);
    expect(FONT_SIZES.buttonLarge).toBeGreaterThanOrEqual(20);
    expect(FONT_SIZES.headingSmall).toBeGreaterThanOrEqual(20);
  });

  test('the shared tap target minimum is 48dp', () => {
    expect(TAP_TARGET_MIN).toBe(48);
  });
});

describe('design tokens: WCAG AA contrast in every button state (PRD AC-13)', () => {
  test('primary text on the page background meets AA', () => {
    expect(contrastRatio(COLORS.text, COLORS.background)).toBeGreaterThanOrEqual(4.5);
  });

  test.each([
    ['normal', COLORS.primary],
    ['hover', COLORS.primaryHover],
    ['pressed', COLORS.primaryPressed],
  ])('white label text on the primary button in its %s state meets AA', (_state, background) => {
    expect(contrastRatio(COLORS.white, background)).toBeGreaterThanOrEqual(4.5);
  });

  test('pressed is darker (higher contrast) than hover, which is darker than normal', () => {
    const normal = contrastRatio(COLORS.white, COLORS.primary);
    const hover = contrastRatio(COLORS.white, COLORS.primaryHover);
    const pressed = contrastRatio(COLORS.white, COLORS.primaryPressed);
    expect(hover).toBeGreaterThan(normal);
    expect(pressed).toBeGreaterThan(hover);
  });

  test.each([
    ['normal', COLORS.optionBackground],
    ['hover', COLORS.optionBackgroundHover],
    ['pressed', COLORS.optionBackgroundPressed],
  ])('answer option text on its %s background meets AA', (_state, background) => {
    expect(contrastRatio(COLORS.text, background)).toBeGreaterThanOrEqual(4.5);
  });

  test('the neutral (incorrect-pick) state meets AA', () => {
    expect(contrastRatio(COLORS.neutralText, COLORS.neutralBackground)).toBeGreaterThanOrEqual(4.5);
  });

  test('the stars token meets the large-text AA threshold on the page background', () => {
    const ratio = contrastRatio(COLORS.stars, COLORS.background);
    expect(meetsWcagAA(ratio, { largeText: true })).toBe(true);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE_TEXT);
  });
});

describe('design tokens: focus ring is visible against whatever it sits on (non-text 3:1)', () => {
  test.each([
    ['primary', COLORS.primary],
    ['primary hover', COLORS.primaryHover],
    ['primary pressed', COLORS.primaryPressed],
  ])('the on-dark focus ring meets 3:1 against the %s button fill', (_label, background) => {
    expect(contrastRatio(COLORS.focusRingOnDark, background)).toBeGreaterThanOrEqual(3);
  });

  test.each([
    ['white', COLORS.white],
    ['option hover tint', COLORS.optionBackgroundHover],
    ['option pressed tint', COLORS.optionBackgroundPressed],
    ['page background', COLORS.background],
  ])('the on-light focus ring meets 3:1 against %s', (_label, background) => {
    expect(contrastRatio(COLORS.focusRingOnLight, background)).toBeGreaterThanOrEqual(3);
  });
});
