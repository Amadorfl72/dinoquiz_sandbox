// Mock to support computed style assertions for button sizing.
// In jsdom, getComputedStyle returns inline styles only. This helper
// can be extended in jest.setup.ts to parse data attributes for min sizes.
export const MIN_BUTTON_HEIGHT = 48;
export const MIN_BUTTON_WIDTH = 48;

// Helper to assert that a style object meets the minimum button height
// requirement of >=48dp as specified in TRIOFSND-32.
export const assertButtonMinHeight = (style: Record<string, unknown>): boolean => {
  const minHeight = Number(style?.minHeight ?? 0);
  return minHeight >= MIN_BUTTON_HEIGHT;
};

// Helper to assert that a style object meets the minimum button width
// requirement of >=48dp as specified in TRIOFSND-32.
export const assertButtonMinWidth = (style: Record<string, unknown>): boolean => {
  const minWidth = Number(style?.minWidth ?? 0);
  return minWidth >= MIN_BUTTON_WIDTH;
};
