// Mock to support computed style assertions for button sizing.
// In jsdom, getComputedStyle returns inline styles only. This helper
// can be extended in jest.setup.ts to parse data attributes for min sizes.
export const MIN_BUTTON_HEIGHT = 48;
export const MIN_BUTTON_WIDTH = 48;
