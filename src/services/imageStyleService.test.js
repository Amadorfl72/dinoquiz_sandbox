'use strict';

const {
  IMAGE_STYLES,
  DEFAULT_IMAGE_STYLE,
  resolveImageStyle,
  resolveQuestionImage,
} = require('./imageStyleService');

function buildQuestion(overrides = {}) {
  return {
    id: 'trex-01',
    dinosaur: 'trex',
    image: 'dinosaurs/trex.svg',
    ...overrides,
  };
}

describe('resolveImageStyle', () => {
  test('resolves the youngest age band to "dibujo"', () => {
    expect(resolveImageStyle('under-7')).toBe(IMAGE_STYLES.DIBUJO);
  });

  test('resolves the 7-plus age band to "realista"', () => {
    expect(resolveImageStyle('7-plus')).toBe(IMAGE_STYLES.REALISTA);
  });

  test('falls back to "dibujo" when the age band is missing or unrecognized', () => {
    expect(resolveImageStyle(null)).toBe(DEFAULT_IMAGE_STYLE);
    expect(resolveImageStyle(undefined)).toBe(DEFAULT_IMAGE_STYLE);
    expect(resolveImageStyle('not-a-band')).toBe(DEFAULT_IMAGE_STYLE);
  });
});

describe('resolveQuestionImage', () => {
  test('"dibujo" resolves straight to the question\'s existing image path, which also acts as its own fallback', () => {
    const question = buildQuestion();
    const resolved = resolveQuestionImage(question, 'under-7');

    expect(resolved).toEqual({
      style: 'dibujo',
      url: 'dinosaurs/trex.svg',
      fallbackUrl: 'dinosaurs/trex.svg',
    });
  });

  test('"realista" resolves to a sibling styled path, falling back to the guaranteed "dibujo" asset', () => {
    const question = buildQuestion();
    const resolved = resolveQuestionImage(question, '7-plus');

    expect(resolved).toEqual({
      style: 'realista',
      url: 'dinosaurs/realista/trex.svg',
      fallbackUrl: 'dinosaurs/trex.svg',
    });
  });

  test('an unknown age band keeps today\'s single asset set (safe default)', () => {
    const question = buildQuestion();
    const resolved = resolveQuestionImage(question, null);

    expect(resolved.style).toBe(DEFAULT_IMAGE_STYLE);
    expect(resolved.url).toBe(question.image);
    expect(resolved.fallbackUrl).toBe(question.image);
  });

  test('is resilient to a missing image field instead of throwing', () => {
    const question = buildQuestion({ image: undefined });
    expect(() => resolveQuestionImage(question, '7-plus')).not.toThrow();
  });
});
